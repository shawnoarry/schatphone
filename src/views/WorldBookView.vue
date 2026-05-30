<script setup>
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute, useRouter } from 'vue-router'
import { useSystemStore } from '../stores/system'
import { useChatStore } from '../stores/chat'
import { useBookStore } from '../stores/book'
import { useI18n } from '../composables/useI18n'
import { useDialog } from '../composables/useDialog'
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
import { buildWorldServiceTemplateGenerationRows } from '../lib/world-pack-service-accounts'
import CurrentWorldPackPanel from '../components/worldbook/CurrentWorldPackPanel.vue'
import WorldBookOverview from '../components/worldbook/WorldBookOverview.vue'

const route = useRoute()
const router = useRouter()
const systemStore = useSystemStore()
const chatStore = useChatStore()
const bookStore = useBookStore()
const { t } = useI18n()
const { confirmDialog } = useDialog()
const { user } = storeToRefs(systemStore)
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
const activeWorldPackServiceTemplateRows = computed(() =>
  buildWorldServiceTemplateGenerationRows({
    pack: worldOverview.value.activePack,
    findExistingContact: (packId, templateId) =>
      chatStore.findWorldServiceTemplateContact(packId, templateId),
  }),
)
const activeWorldPackAppBindingRows = computed(() =>
  buildWorldAppBindingRows({
    pack: worldOverview.value.activePack,
  }),
)
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

const createWorldPackServiceTemplateContact = (templateId = '') => {
  const row = activeWorldPackServiceTemplateRows.value.find((item) => item.id === templateId)
  if (!row?.payload) {
    uiNotice.value = t('这个服务号模板暂时不能生成，请先检查当前世界包。', 'This service template cannot be created yet. Check the active world pack first.')
    return
  }

  const contact = chatStore.createWorldServiceTemplateContact(row.payload)
  if (!contact) {
    uiNotice.value = t('服务号生成失败，请稍后重试。', 'Service account creation failed. Please retry.')
    return
  }

  chatStore.saveNow()
  pulseSaved(
    row.generated
      ? t('这个服务号已经在 Chat Directory 中。', 'This service account already exists in Chat Directory.')
      : t('服务号已生成到 Chat Directory。', 'Service account created in Chat Directory.'),
  )
}

const openWorldPackServiceContact = (contactId = 0) => {
  const numericId = Number(contactId)
  if (!Number.isFinite(numericId) || numericId <= 0) return
  router.push({
    path: `/chat/${Math.floor(numericId)}`,
    query: {
      from: 'worldbook',
      worldPack: worldOverview.value.activePack?.id || 'default_world',
    },
  })
}

const openWorldPackAppBinding = (bindingId = '') => {
  const row = activeWorldPackAppBindingRows.value.find((item) => item.id === bindingId)
  if (!row?.launchable) {
    uiNotice.value = t('这个世界应用还没有可打开的模块路线。', 'This world app does not have a launch route yet.')
    return
  }
  router.push({
    path: row.route,
    query: {
      from: 'worldbook',
      ...row.query,
    },
  })
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

const openEditKnowledgePoint = (point) => {
  if (!point?.id) return
  editingKnowledgePointId.value = point.id
  knowledgeDraft.title = point.title || ''
  knowledgeDraft.content = point.content || ''
  knowledgeDraft.tags = formatKnowledgePointTags(point)
  saved.value = false
  uiNotice.value = ''
}

const cancelKnowledgePointEdit = () => {
  resetKnowledgeDraft()
  uiNotice.value = ''
  saved.value = false
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

      <CurrentWorldPackPanel
        :overview="worldOverview"
        :packs="worldPackCandidates"
        :selected-pack-id="selectedWorldPackId || worldOverview.activePack?.id"
        :activation-review="selectedWorldPackReview"
        :app-binding-rows="activeWorldPackAppBindingRows"
        :service-template-rows="activeWorldPackServiceTemplateRows"
        @select-pack="selectWorldPack"
        @activate-pack="activateSelectedWorldPack"
        @open-app-binding="openWorldPackAppBinding"
        @create-service-template="createWorldPackServiceTemplateContact"
        @open-service-contact="openWorldPackServiceContact"
      />

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

      <section class="rounded-2xl bg-white border border-gray-200 p-4 space-y-3" data-testid="worldbook-book-sources">
        <div class="flex items-start justify-between gap-3">
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

        <div v-if="sourcePicker.open" class="worldbook-source-picker" data-testid="worldbook-source-picker">
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

        <p v-if="linkedBookSources.length === 0" class="text-sm text-gray-500" data-testid="worldbook-book-source-empty">
          {{ t('还没有连接文本库来源，当前仍使用下方全局世界观文本。', 'No Book sources are linked yet. The global worldview below remains active.') }}
        </p>

        <div v-for="link in linkedBookSources" :key="link.id" class="worldbook-template-row" :data-testid="`worldbook-book-source-${link.id}`">
          <div class="min-w-0">
            <p class="font-medium truncate">{{ link.title }}</p>
            <p class="text-xs text-gray-500">
              {{ link.usageLabel }} · {{ link.sectionSummary }} · {{ link.enabled === false ? t('停用', 'Disabled') : t('启用', 'Enabled') }}
              <span v-if="link.missing" class="text-red-600"> · {{ t('来源缺失', 'Missing source') }}</span>
              <span v-else-if="link.changed" class="text-amber-700"> · {{ t('已修改待复核', 'Changed') }}</span>
            </p>
          </div>
          <div class="flex flex-wrap gap-2 justify-end">
            <button v-if="link.changed && !link.missing" type="button" class="worldbook-secondary-action" :data-testid="`worldbook-book-source-review-${link.id}`" @click="openBookSourceReview(link)">
              {{ t('查看变更', 'Review changes') }}
            </button>
            <button type="button" class="worldbook-secondary-action" :data-testid="`worldbook-book-source-toggle-${link.id}`" @click="toggleBookSource(link)">
              {{ link.enabled === false ? t('启用', 'Enable') : t('停用', 'Disable') }}
            </button>
            <button type="button" class="worldbook-secondary-action" :data-testid="`worldbook-book-source-open-${link.id}`" @click="openBookSource(link.assetId)">
              {{ t('打开', 'Open') }}
            </button>
            <button type="button" class="worldbook-secondary-action" :data-testid="`worldbook-book-source-remove-${link.id}`" @click="removeBookSource(link.id)">
              {{ t('移除', 'Remove') }}
            </button>
          </div>
        </div>

        <div
          v-if="reviewingBookSource"
          class="worldbook-source-review"
          data-testid="worldbook-book-source-review-panel"
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

      <div class="rounded-2xl bg-white border border-gray-200 p-4" data-testid="worldbook-world-kernel">
        <p class="text-sm font-semibold">{{ t('全局世界观（必选）', 'Global worldview (required)') }}</p>
        <p class="text-xs text-gray-500 mt-1">
          {{
            t(
              '全局世界观会作为所有聊天和模块生成的基础背景。',
              'Global worldview is used as the base context for all chats and modules.',
            )
          }}
        </p>
        <textarea
          v-model="globalWorldview"
          class="w-full h-48 mt-3 border border-gray-200 rounded-lg p-3 text-sm outline-none resize-none"
          :placeholder="
            t(
              '例如：世界规则、时代背景、组织结构、角色关系约束...',
              'Example: world rules, era background, organization structure, and role constraints...',
            )
          "
        ></textarea>
        <p class="text-[11px] text-gray-400 mt-2">
          {{ t('当前字数：', 'Current count: ') }}{{ worldBookCount }}
        </p>
        <button
          @click="saveWorldBook"
          class="mt-3 w-full py-2.5 rounded-lg text-sm font-semibold transition"
          :class="saved ? 'bg-green-500 text-white' : 'bg-blue-500 text-white hover:bg-blue-600'"
        >
          {{ saved ? t('已保存', 'Saved') : t('保存世界观', 'Save worldview') }}
        </button>
      </div>

      <section class="rounded-2xl bg-white border border-gray-200 p-4 space-y-3" data-testid="worldbook-profile-templates">
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

        <div class="space-y-2">
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

        <div class="space-y-2">
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

      <div class="rounded-2xl bg-white border border-gray-200 p-4 space-y-3">
        <div class="flex items-center justify-between">
          <p class="text-sm font-semibold">{{ t('知识点（可绑定角色）', 'Knowledge points (bindable)') }}</p>
          <span class="text-[11px] text-gray-400">
            {{ t('总数', 'Count') }} {{ knowledgePoints.length }}
          </span>
        </div>
        <p class="text-xs text-gray-500">
          {{
            t(
              '知识点用于角色级补丁（如语言规范、额外设定、模型偏好），可在通讯录绑定到指定角色。',
              'Knowledge points are role-level patches (language rules, extra lore, model hints) and can be bound in Contacts.',
            )
          }}
        </p>

        <div class="space-y-2 rounded-xl border border-gray-200 p-3">
          <div v-if="isEditingKnowledgePoint" class="flex items-center justify-between gap-2 rounded-lg bg-amber-50 px-3 py-2 text-[11px] text-amber-700">
            <span data-testid="knowledge-editing-state">
              {{ t('正在编辑已有知识点', 'Editing existing knowledge point') }}
            </span>
            <button
              type="button"
              data-testid="knowledge-edit-cancel"
              class="font-semibold text-amber-700"
              @click="cancelKnowledgePointEdit"
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

        <div v-if="knowledgePoints.length > 0" class="rounded-xl border border-gray-200 bg-gray-50 p-3 space-y-2">
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

        <div v-if="knowledgePoints.length === 0" class="text-xs text-gray-500 border border-dashed border-gray-200 rounded-lg p-3 text-center">
          {{ t('暂无知识点。', 'No knowledge points yet.') }}
        </div>

        <div
          v-else-if="visibleKnowledgePoints.length === 0"
          class="text-xs text-gray-500 border border-dashed border-gray-200 rounded-lg p-3 text-center"
        >
          {{ t('当前筛选下没有知识点。', 'No knowledge points match the current filter.') }}
        </div>

        <div v-else class="space-y-2">
          <div
            v-for="point in visibleKnowledgePoints"
            :key="point.id"
            data-testid="knowledge-point-card"
            class="rounded-xl border p-3 space-y-1"
            :class="isDeepLinkedKnowledgePoint(point) ? 'border-blue-200 bg-blue-50/30' : 'border-gray-200 bg-white'"
          >
            <div class="flex items-center justify-between gap-2">
              <p class="text-sm font-semibold truncate">{{ point.title }}</p>
              <div class="flex items-center gap-2 shrink-0">
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
            <p class="text-xs text-gray-600 whitespace-pre-wrap">{{ point.content }}</p>
            <p v-if="Array.isArray(point.tags) && point.tags.length > 0" class="text-[11px] text-gray-400">
              #{{ point.tags.join(' #') }}
            </p>
            <div class="rounded-lg border border-gray-100 bg-gray-50 px-2.5 py-2 text-[11px] text-gray-600 space-y-1">
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

.worldbook-scroll > .rounded-2xl {
  border: 1px solid var(--system-card-border);
  border-radius: var(--system-radius-lg);
  background: var(--system-panel-bg);
  box-shadow: var(--system-shadow-card);
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
  padding: 12px;
  border: 1px solid var(--system-control-border);
  border-radius: var(--system-radius-md);
  background: var(--system-surface-muted);
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
  padding: 12px;
  border: 1px solid rgba(245, 158, 11, 0.34);
  border-radius: 8px;
  background: rgba(255, 251, 235, 0.78);
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
