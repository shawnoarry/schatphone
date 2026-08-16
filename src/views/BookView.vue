<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useBookStore } from '../stores/book'
import { useSystemStore } from '../stores/system'
import { useDialog } from '../composables/useDialog'
import { useI18n } from '../composables/useI18n'
import { pushReturnTarget, resolveReturnLabel } from '../lib/navigation-return'
import { BOOK_TEXT_ASSET_TYPES } from '../lib/book-text-schema'
import { getBookTextCategoryLabel, normalizeBookTextCategory } from '../lib/world-taxonomy'
import { isBuiltInBookTextAssetId } from '../lib/built-in-book-assets'
import { getBookCompletenessRating } from '../lib/book-rating'
import BookShelfPane from '../components/book/BookShelfPane.vue'
import BookDetailPane from '../components/book/BookDetailPane.vue'
import BookEditorSheet from '../components/book/BookEditorSheet.vue'
import BookExportSheet from '../components/book/BookExportSheet.vue'
import BookToolsSheet from '../components/book/BookToolsSheet.vue'

const router = useRouter()
const route = useRoute()
const bookStore = useBookStore()
const systemStore = useSystemStore()
const { t } = useI18n()
const { confirmDialog } = useDialog()

const SHELF_STATE_KEY = 'schatphone:book:shelf-open'

const searchQuery = ref('')
const typeFilter = ref('all')
const selectedAssetId = ref(typeof route.query.asset === 'string' ? route.query.asset : '')
const storedShelfState = typeof localStorage === 'undefined' ? null : localStorage.getItem(SHELF_STATE_KEY)
const shelfOpen = ref(
  selectedAssetId.value
    ? false
    : storedShelfState === null
      ? true
      : storedShelfState === '1',
)
const editMode = ref(false)
const editGuardVisible = ref(false)
const importFeedback = ref('')
const importFeedbackTone = ref('info')
const aiToolsOpen = ref(false)
const aiToolMode = ref('summary')
const exportSheetOpen = ref(false)
const draft = ref({
  title: '',
  category: 'worldview',
  tags: '',
  content: '',
})

watch(shelfOpen, (open) => {
  try {
    localStorage.setItem(SHELF_STATE_KEY, open ? '1' : '0')
  } catch {
    /* storage may be unavailable */
  }
})

const returnButtonLabel = computed(() =>
  resolveReturnLabel(route, 'Home') === 'WorldBook'
    ? t('世界书', 'WorldBook')
    : t('返回', 'Back'),
)

const exportFormatOptions = computed(() => [
  {
    id: 'worldbook_json',
    icon: 'fas fa-box-archive',
    extension: '.worldbook.json',
    title: t('完整数据文件', 'Lossless data file'),
    detail: t(
      '完整备份（含分类、标签和目录），适合换设备后恢复书架。',
      'Full backup with category, tags, and outline — best for moving your library to another device.',
    ),
  },
  {
    id: 'markdown',
    icon: 'fas fa-file-code',
    extension: '.md',
    title: t('Markdown 文稿', 'Markdown manuscript'),
    detail: t(
      '适合在外部编辑器中改写、扩写；重新导入时可恢复分类与标签。',
      'Best for editing and expanding elsewhere; category and tags can be restored on import.',
    ),
  },
  {
    id: 'text',
    icon: 'fas fa-file-lines',
    extension: '.txt',
    title: t('纯文本文稿', 'Plain text manuscript'),
    detail: t(
      '只导出正文，便于复制和通用阅读，不保留 Book 元数据。',
      'Exports body text only for universal reading and copying, without Book metadata.',
    ),
  },
])

const storageBusy = computed(() =>
  ['checking', 'upgrading', 'saving'].includes(bookStore.storageState),
)

const storageStatusCopy = computed(() => {
  if (bookStore.storageState === 'checking') {
    return {
      title: t('正在检查书架', 'Checking your library'),
      detail: t('正在确认书籍保存在哪里。', 'Confirming where your books are kept.'),
    }
  }
  if (bookStore.storageState === 'upgrading') {
    return {
      title: t('正在升级书架存档', 'Upgrading library storage'),
      detail: t('升级完成前，原来的书都还在。', 'Your books stay in place until the upgrade completes.'),
    }
  }
  if (bookStore.storageState === 'saving') {
    return {
      title: t('正在保存', 'Saving'),
      detail: t('正在把最新改动写入存档。', 'Writing the latest changes.'),
    }
  }
  if (bookStore.storageState === 'read_only_conflict') {
    return {
      title: t('暂时只能查看', 'Read-only for now'),
      detail: t('另一个页面正在编辑书架，稍后再试。', 'Another page is editing the library. Try again shortly.'),
    }
  }
  if (bookStore.storageState === 'error') {
    return {
      title: t('书架存档需要恢复', 'Library storage needs recovery'),
      detail: t('为避免书籍丢失，当前只能查看。', 'Books are read-only to keep them safe.'),
    }
  }
  if (bookStore.storageMode === 'repository') {
    return {
      title: t('书架存档已升级', 'Library storage upgraded'),
      detail: t('原数据已保留备份，可放心使用。', 'A backup of the original data is kept.'),
    }
  }
  return {
    title: t('书架存档可升级', 'Library upgrade available'),
    detail: t('升级后保存更可靠，建议有空时点一下。', 'Upgrading keeps your books safer. Recommended when you have a moment.'),
  }
})

const typeLabels = Object.fromEntries(
  BOOK_TEXT_ASSET_TYPES.map((category) => [category, getBookTextCategoryLabel(category)]),
)

const statusLabels = {
  draft: { zh: '草稿', en: 'Draft' },
  active_source: { zh: '启用来源', en: 'Active source' },
  archived: { zh: '归档', en: 'Archived' },
}

const categoryLabelOf = (category) => {
  const normalized = normalizeBookTextCategory(category)
  return t(typeLabels[normalized]?.zh || normalized, typeLabels[normalized]?.en || normalized)
}

const shelfTabs = computed(() => [
  { id: 'all', label: t('书架', 'Shelf') },
  ...BOOK_TEXT_ASSET_TYPES.map((type) => ({
    id: type,
    label: t(typeLabels[type]?.zh || type, typeLabels[type]?.en || type),
  })),
])

const filteredAssets = computed(() => {
  const query = searchQuery.value.trim()
  const filters = {
    search: query,
    category: typeFilter.value === 'all' ? '' : typeFilter.value,
  }
  return bookStore.listAssets(filters)
})

const worldBookLinkCounts = computed(() => {
  const counts = new Map()
  systemStore.listWorldBookSourceLinks().forEach((link) => {
    counts.set(link.assetId, (counts.get(link.assetId) || 0) + 1)
  })
  return counts
})

const toShelfItem = (asset) => {
  const category = normalizeBookTextCategory(asset.category || asset.assetType)
  return {
    id: asset.id,
    title: asset.title,
    category,
    categoryLabel: categoryLabelOf(category),
    status: asset.status || 'draft',
    rating: getBookCompletenessRating(asset, worldBookLinkCounts.value.get(asset.id) || 0),
  }
}

const shelfGroups = computed(() => {
  const categories = typeFilter.value === 'all' ? BOOK_TEXT_ASSET_TYPES : [typeFilter.value]
  return categories
    .map((category) => ({
      id: category,
      label: categoryLabelOf(category),
      items: filteredAssets.value
        .filter((asset) => normalizeBookTextCategory(asset.category || asset.assetType) === category)
        .map(toShelfItem),
    }))
    .filter((group) => group.items.length > 0)
})

const selectedAsset = computed(() =>
  bookStore.findAssetById(selectedAssetId.value) || filteredAssets.value[0] || bookStore.libraryAssets[0] || null,
)

const selectedSections = computed(() =>
  Array.isArray(selectedAsset.value?.sections) ? selectedAsset.value.sections : [],
)

const selectedTags = computed(() =>
  Array.isArray(selectedAsset.value?.tags) ? selectedAsset.value.tags : [],
)

const selectedWorldBookLinks = computed(() => {
  const asset = selectedAsset.value
  if (!asset) return []
  return systemStore
    .listWorldBookSourceLinks()
    .filter((link) => link.assetId === asset.id)
})

const selectedWorldBookUsageSummary = computed(() => {
  const links = selectedWorldBookLinks.value
  if (links.length === 0) return ''
  const activeCount = links.filter((link) => link.enabled !== false).length
  return t(
    `${activeCount} 个启用引用，${links.length} 个总引用`,
    `${activeCount} active links, ${links.length} total links`,
  )
})

const selectedAssetTypeLabel = computed(() =>
  categoryLabelOf(selectedAsset.value?.category || selectedAsset.value?.assetType || 'encyclopedia'),
)

const selectedStatusLabel = computed(() => {
  const status = selectedAsset.value?.status || 'draft'
  return t(statusLabels[status]?.zh || status, statusLabels[status]?.en || status)
})

const selectedAssetIsBuiltIn = computed(() => isBuiltInBookTextAssetId(selectedAsset.value?.id))

const selectedRating = computed(() =>
  getBookCompletenessRating(selectedAsset.value, selectedWorldBookLinks.value.length),
)

const selectedUpdatedText = computed(() => {
  const ts = Number(selectedAsset.value?.updatedAt || 0)
  if (!ts) return ''
  const diff = Date.now() - ts
  const days = Math.floor(diff / 86400000)
  if (days >= 1) return t(`${days} 天前更新`, `${days}d ago`)
  const hours = Math.floor(diff / 3600000)
  if (hours >= 1) return t(`${hours} 小时前更新`, `${hours}h ago`)
  return t('刚刚更新', 'Just updated')
})

const selectedIntroText = computed(() => {
  const text = String(selectedAsset.value?.content || '')
    .replace(/^#+\s+/gm, '')
    .replace(/\s+/g, ' ')
    .trim()
  if (!text) return t('这份文本还没有内容。', 'This source has no content yet.')
  return text.length > 220 ? `${text.slice(0, 220)}…` : text
})

const aiToolOptions = computed(() => [
  {
    id: 'summary',
    icon: 'fas fa-feather',
    label: t('摘要', 'Summary'),
  },
  {
    id: 'sections',
    icon: 'fas fa-list-ul',
    label: t('分段', 'Sections'),
  },
  {
    id: 'tags',
    icon: 'fas fa-tags',
    label: t('标签', 'Tags'),
  },
  {
    id: 'worldbook',
    icon: 'fas fa-link',
    label: t('引用', 'WorldBook'),
  },
])

const selectedContentText = computed(() => String(selectedAsset.value?.content || '').trim())

const aiSummaryText = computed(() => {
  const text = selectedContentText.value.replace(/\s+/g, ' ')
  if (!text) return t('当前文本为空。', 'This text is empty.')
  const preview = text.length > 220 ? `${text.slice(0, 220)}...` : text
  return t(`摘要预览：${preview}`, `Summary preview: ${preview}`)
})

const aiSectionsText = computed(() => {
  if (selectedSections.value.length === 0) {
    return t('没有检测到标题分段。', 'No heading sections detected.')
  }
  return selectedSections.value
    .slice(0, 6)
    .map((section, index) => `${index + 1}. ${section.title}`)
    .join('\n')
})

const aiTagsText = computed(() => {
  if (selectedTags.value.length > 0) return selectedTags.value.join(', ')
  const words = selectedContentText.value
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5\s]+/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 2)
  const candidates = [...new Set(words)].slice(0, 8)
  return candidates.length > 0 ? candidates.join(', ') : t('没有可建议的标签。', 'No tag suggestions yet.')
})

const aiWorldBookText = computed(() => {
  if (selectedWorldBookLinks.value.length === 0) {
    return t(
      '这份文本尚未被 WorldBook 引用。',
      'This text is not linked by WorldBook yet.',
    )
  }
  return selectedWorldBookUsageSummary.value
})

const aiToolResultText = computed(() => {
  if (aiToolMode.value === 'sections') return aiSectionsText.value
  if (aiToolMode.value === 'tags') return aiTagsText.value
  if (aiToolMode.value === 'worldbook') return aiWorldBookText.value
  return aiSummaryText.value
})

const draftIsDirty = computed(() => {
  const asset = selectedAsset.value
  if (!asset) return false
  return (
    draft.value.title !== asset.title ||
    draft.value.category !== (asset.category || asset.assetType) ||
    draft.value.tags !== (asset.tags || []).join(', ') ||
    draft.value.content !== asset.content
  )
})

const goBack = () => {
  pushReturnTarget(router, route, '/home')
}

const openWorldBookUsage = () => {
  router.push({
    path: '/worldbook',
    query: {
      from: 'settings',
    },
  })
}

const openShelf = () => {
  shelfOpen.value = true
  aiToolsOpen.value = false
  editGuardVisible.value = false
}

const selectAsset = (assetId) => {
  selectedAssetId.value = assetId
  shelfOpen.value = false
  editMode.value = false
  editGuardVisible.value = false
  aiToolsOpen.value = false
}

const hydrateDraft = () => {
  const asset = selectedAsset.value
  draft.value = {
    title: asset?.title || '',
    category: asset?.category || asset?.assetType || 'worldview',
    tags: Array.isArray(asset?.tags) ? asset.tags.join(', ') : '',
    content: asset?.content || '',
  }
}

watch(selectedAsset, hydrateDraft, { immediate: true })

const createBlankAsset = () => {
  if (bookStore.storageReadOnly) return
  const asset = bookStore.createAsset({
    title: t('新的文本来源', 'New text source'),
    category: 'worldview',
    format: 'markdown',
    content: '# New Source\n\n',
  })
  if (!asset) return
  selectAsset(asset.id)
  editMode.value = true
  shelfOpen.value = false
  aiToolsOpen.value = false
}

const toggleAiTools = () => {
  if (!selectedAsset.value) return
  aiToolsOpen.value = !aiToolsOpen.value
}

const beginEdit = () => {
  const asset = selectedAsset.value
  if (!asset) return
  hydrateDraft()
  if (asset.locked || asset.status === 'active_source') {
    editGuardVisible.value = true
    return
  }
  editMode.value = true
}

const confirmGuardedEdit = () => {
  editGuardVisible.value = false
  if (selectedAssetIsBuiltIn.value) {
    const sourceAsset = selectedAsset.value
    const copy = bookStore.createAsset({
      ...sourceAsset,
      id: undefined,
      title: `${sourceAsset.title} ${t('副本', 'Copy')}`,
      locked: false,
      favorite: false,
      status: 'draft',
      source: {
        kind: 'built_in_copy',
        sourceAssetId: sourceAsset.id,
        copiedAt: Date.now(),
      },
    })
    selectAsset(copy.id)
    hydrateDraft()
  }
  editMode.value = true
}

const cancelEdit = async () => {
  if (draftIsDirty.value) {
    const confirmed = await confirmDialog({
      title: t('放弃修改', 'Discard changes'),
      message: t('当前编辑还没有保存。要放弃这些修改吗？', 'This edit is not saved. Discard it?'),
      confirmText: t('放弃', 'Discard'),
      cancelText: t('继续编辑', 'Keep editing'),
      tone: 'danger',
    })
    if (!confirmed) return
  }
  editMode.value = false
  editGuardVisible.value = false
  hydrateDraft()
}

const saveEdit = () => {
  const asset = selectedAsset.value
  if (!asset) return
  const tags = draft.value.tags
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean)
  const result = bookStore.updateAsset(
    asset.id,
    {
      title: draft.value.title,
      category: draft.value.category,
      tags,
      content: draft.value.content,
      format: draft.value.content.trim().startsWith('#') ? 'markdown' : asset.format,
    },
    { force: true },
  )
  if (result.ok) {
    selectedAssetId.value = result.asset.id
    editMode.value = false
    shelfOpen.value = false
    importFeedbackTone.value = 'success'
    importFeedback.value = t('已保存文本来源。', 'Text source saved.')
    return
  }
  importFeedbackTone.value = 'error'
  importFeedback.value =
    result.reason === 'built_in'
      ? t('内置文本需要先复制成副本再编辑。', 'Built-in text must be copied before editing.')
      : t('保存失败。', 'Save failed.')
}

const toggleFavorite = () => {
  const asset = selectedAsset.value
  if (!asset || selectedAssetIsBuiltIn.value || bookStore.storageReadOnly) return
  const result = bookStore.updateAsset(
    asset.id,
    { favorite: !asset.favorite },
    { force: true, preserveVersion: true },
  )
  if (!result.ok) {
    importFeedbackTone.value = 'error'
    importFeedback.value = t('收藏失败。', 'Favorite failed.')
  }
}

const requestDelete = async () => {
  const asset = selectedAsset.value
  if (!asset || selectedAssetIsBuiltIn.value || bookStore.storageReadOnly) return
  const confirmed = await confirmDialog({
    title: t('删除文本来源', 'Delete text source'),
    message:
      asset.status === 'active_source'
        ? t(
            '这份文本正在被 WorldBook 引用，删除后对应引用会失效。确认删除吗？',
            'This text is linked by WorldBook; deleting it breaks those links. Delete anyway?',
          )
        : t('删除后不可恢复。确认从书架移除这本书吗？', 'This cannot be undone. Remove this book from the shelf?'),
    details: [`${t('标题', 'Title')}: ${asset.title}`],
    confirmText: t('删除', 'Delete'),
    cancelText: t('取消', 'Cancel'),
    tone: 'danger',
  })
  if (!confirmed) return
  const result = bookStore.deleteAsset(asset.id, { force: true })
  if (result.ok) {
    selectedAssetId.value = ''
    editMode.value = false
    editGuardVisible.value = false
    shelfOpen.value = true
    importFeedbackTone.value = 'success'
    importFeedback.value = t('已删除文本来源。', 'Text source deleted.')
    return
  }
  importFeedbackTone.value = 'error'
  importFeedback.value =
    result.reason === 'built_in'
      ? t('内置文本不能删除。', 'Built-in text cannot be deleted.')
      : t('删除失败。', 'Delete failed.')
}

const showStorageFeedback = (tone, message) => {
  importFeedbackTone.value = tone
  importFeedback.value = message
}

const upgradeBookStorage = async () => {
  if (storageBusy.value || bookStore.storageMode === 'repository') return
  const confirmed = await confirmDialog({
    title: t('升级书架存档', 'Upgrade library storage'),
    message: t(
      '我们会先完整备份并检查你的书籍，再切换到新存档。原数据不会删除，世界书里的启用状态也不受影响。',
      'Your books are fully backed up and verified before switching. Nothing is deleted, and WorldBook activations stay unchanged.',
    ),
    confirmText: t('检查并升级', 'Check and upgrade'),
    cancelText: t('取消', 'Cancel'),
    tone: 'accent',
  })
  if (!confirmed) return

  const persistence = await bookStore.requestBookPersistentStorage()
  if (persistence.capacity?.status === 'insufficient') {
    showStorageFeedback(
      'error',
      t('浏览器可用空间不足，没有进行升级。', 'Not enough browser space. Nothing was changed.'),
    )
    return
  }
  if (persistence.capacity?.status === 'unknown') {
    showStorageFeedback(
      'error',
      t('暂时无法确认可用空间，没有进行升级。', 'Available space could not be confirmed. Nothing was changed.'),
    )
    return
  }

  let allowBestEffort = persistence.state === 'persistent'
  if (!allowBestEffort) {
    allowBestEffort = await confirmDialog({
      title: t('浏览器未承诺长期保护', 'No long-term protection'),
      message: t(
        '浏览器没有承诺长期保护这些数据。仍可继续，但清理浏览器数据时书籍有丢失风险。',
        'The browser did not promise long-term protection. You can continue, but clearing site data may lose books.',
      ),
      confirmText: t('仍然继续', 'Continue anyway'),
      cancelText: t('暂不升级', 'Not now'),
      tone: 'warning',
    })
    if (!allowBestEffort) return
  }

  const worldBookSourceLinks = systemStore.listWorldBookSourceLinks()
  let result = await bookStore.upgradeBookStorage({ allowBestEffort, worldBookSourceLinks })
  if (result.code === 'legacy_recovery_candidate') {
    const useMirror = await confirmDialog({
      title: t('找到一份可恢复的备份', 'Recoverable backup found'),
      message: t(
        '本地存档暂时读不出来，但浏览器里留有一份备份。用这份备份完成升级吗？',
        'The local data is unreadable, but a browser backup exists. Use it for this upgrade?',
      ),
      confirmText: t('使用备份', 'Use backup'),
      cancelText: t('取消', 'Cancel'),
      tone: 'warning',
    })
    if (!useMirror) return
    result = await bookStore.upgradeBookStorage({
      allowBestEffort,
      allowRecoveryCandidate: true,
      worldBookSourceLinks,
    })
  }

  if (result.ok) {
    showStorageFeedback(
      'success',
      t('书架存档升级完成，原数据已保留备份。', 'Library storage upgraded. A backup of the original data is kept.'),
    )
    return
  }
  showStorageFeedback(
    'error',
    t('升级没有成功，书籍仍保留在原存档。', 'Upgrade did not complete. Your books remain in the original storage.'),
  )
}

const retryBookStorageWrite = async () => {
  const result = await bookStore.retryBookStorageWrite()
  showStorageFeedback(
    result.ok ? 'success' : 'error',
    result.ok
      ? t('Book 已保存。', 'Book saved.')
      : t('保存没有成功，请再试一次。', 'Save did not complete. Please try again.'),
  )
}

const refreshBookStorage = async () => {
  const result = await bookStore.refreshBookStorage()
  showStorageFeedback(
    result.ok ? 'success' : 'error',
    result.ok
      ? t('已刷新为当前存档。', 'Refreshed to the current save.')
      : t('刷新没有成功，请稍后再试。', 'Refresh did not complete. Please try again shortly.'),
  )
}

const importFile = async (event) => {
  const file = event?.target?.files?.[0]
  if (event?.target) event.target.value = ''
  if (!file || typeof file.text !== 'function') return

  const confirmed = await confirmDialog({
    title: t('导入文本来源', 'Import text source'),
    message: t(
      '确认把这个文件导入文本库吗？导入后仍需在 WorldBook 中启用才会影响上下文。',
      'Import this file into Book? It will only affect context after you enable it in WorldBook.',
    ),
    details: [
      `${t('文件', 'File')}: ${file.name || 'source'}`,
      `${t('类型', 'Type')}: ${file.type || t('未知', 'Unknown')}`,
      `${t('大小', 'Size')}: ${Number(file.size || 0)} B`,
    ],
    confirmText: t('导入', 'Import'),
    cancelText: t('取消', 'Cancel'),
    tone: 'accent',
  })
  if (!confirmed) return

  const content = await file.text()
  const result = bookStore.importTextAsset({
    fileName: file.name,
    mimeType: file.type || '',
    content,
  })
  if (!result.ok) {
    importFeedbackTone.value = 'error'
    importFeedback.value = result.message || t('导入失败。', 'Import failed.')
    return
  }
  selectedAssetId.value = result.asset.id
  editMode.value = false
  shelfOpen.value = false
  importFeedbackTone.value = 'success'
  importFeedback.value = t('已导入文本来源。', 'Text source imported.')
}

const downloadExportFile = (file) => {
  if (
    !file ||
    typeof Blob === 'undefined' ||
    typeof document === 'undefined' ||
    typeof URL === 'undefined' ||
    typeof URL.createObjectURL !== 'function'
  ) {
    return false
  }
  const blob = new Blob([file.content], {
    type: file.mimeType,
  })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = file.fileName
  anchor.rel = 'noopener'
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
  return true
}

const openExportSheet = () => {
  if (!selectedAsset.value) return
  exportSheetOpen.value = true
}

const exportSelected = (format = 'worldbook_json') => {
  const asset = selectedAsset.value
  if (!asset) return
  const file = bookStore.exportAssetFile(asset.id, format)
  if (!file) return
  const downloaded = downloadExportFile(file)
  exportSheetOpen.value = false
  importFeedbackTone.value = 'success'
  importFeedback.value = t(`已生成 ${file.fileName}。`, `${file.fileName} prepared.`)
  if (downloaded) {
    importFeedback.value = t(`已下载 ${file.fileName}。`, `${file.fileName} downloaded.`)
  }
}

const onKeydown = (event) => {
  if (event.key !== 'Escape') return
  if (editMode.value) {
    cancelEdit()
    return
  }
  if (exportSheetOpen.value) {
    exportSheetOpen.value = false
    return
  }
  if (aiToolsOpen.value) {
    aiToolsOpen.value = false
  }
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
  <div class="book-shell">
    <header class="book-topbar">
      <button type="button" class="book-back" data-testid="book-back" @click="goBack">
        <i class="fas fa-chevron-left" aria-hidden="true"></i>
        <span>{{ returnButtonLabel }}</span>
      </button>
      <div class="book-brand">
        <small>TEXT&nbsp;LIBRARY</small>
        <h1>{{ t('文本库', 'Book') }}</h1>
      </div>
      <div class="book-topbar-actions">
        <button
          type="button"
          class="book-topbar-button is-quiet book-shelf-trigger"
          :aria-label="t('书架', 'Shelf')"
          data-testid="book-open-shelf"
          @click="openShelf"
        >
          <i class="fas fa-layer-group" aria-hidden="true"></i>
        </button>
        <button
          type="button"
          class="book-topbar-button is-quiet"
          :aria-label="t('智能工具', 'Smart tools')"
          :disabled="!selectedAsset"
          data-testid="book-ai-trigger"
          @click="toggleAiTools"
        >
          <i class="fas fa-wand-magic-sparkles" aria-hidden="true"></i>
        </button>
        <button
          type="button"
          class="book-topbar-button"
          :aria-label="t('新建', 'New')"
          :disabled="bookStore.storageReadOnly || storageBusy"
          data-testid="book-create"
          @click="createBlankAsset"
        >
          <i class="fas fa-plus" aria-hidden="true"></i>
        </button>
      </div>
    </header>

    <main :class="['book-main', { 'is-shelf-open': shelfOpen || !selectedAsset }]">
      <BookShelfPane
        v-model:search-query="searchQuery"
        v-model:active-tab="typeFilter"
        :groups="shelfGroups"
        :total-count="filteredAssets.length"
        :tabs="shelfTabs"
        :selected-id="selectedAsset?.id || ''"
        :storage-state="bookStore.storageState"
        :storage-mode="bookStore.storageMode"
        :storage-busy="storageBusy"
        :storage-read-only="bookStore.storageReadOnly"
        :storage-status-copy="storageStatusCopy"
        :import-feedback="importFeedback"
        :import-feedback-tone="importFeedbackTone"
        @select="selectAsset"
        @import-file="importFile"
        @upgrade-storage="upgradeBookStorage"
        @retry-storage="retryBookStorageWrite"
        @refresh-storage="refreshBookStorage"
        @close="shelfOpen = false"
      />

      <BookDetailPane
        v-if="selectedAsset"
        :asset="selectedAsset"
        :type-label="selectedAssetTypeLabel"
        :status-label="selectedStatusLabel"
        :updated-text="selectedUpdatedText"
        :rating="selectedRating"
        :summary="selectedIntroText"
        :tags="selectedTags"
        :sections="selectedSections"
        :link-count="selectedWorldBookLinks.length"
        :usage-summary="selectedWorldBookUsageSummary"
        :is-built-in="selectedAssetIsBuiltIn"
        :favorite="selectedAsset.favorite === true"
        :action-disabled="bookStore.storageReadOnly || storageBusy"
        :edit-guard-visible="editGuardVisible"
        @edit="beginEdit"
        @confirm-guard="confirmGuardedEdit"
        @export="openExportSheet"
        @delete="requestDelete"
        @toggle-favorite="toggleFavorite"
        @open-usage="openWorldBookUsage"
        @open-shelf="openShelf"
      />
    </main>

    <BookExportSheet
      :open="exportSheetOpen && !!selectedAsset"
      :title="selectedAsset?.title || ''"
      :options="exportFormatOptions"
      @close="exportSheetOpen = false"
      @select="exportSelected"
    />

    <BookEditorSheet
      :open="editMode"
      v-model="draft"
      :disabled="bookStore.storageReadOnly || storageBusy"
      @save="saveEdit"
      @cancel="cancelEdit"
    />

    <BookToolsSheet
      :open="aiToolsOpen && !!selectedAsset"
      :title="selectedAsset?.title || ''"
      :tools="aiToolOptions"
      :active-tool="aiToolMode"
      :result-text="aiToolResultText"
      @close="aiToolsOpen = false"
      @select="aiToolMode = $event"
    />
  </div>
</template>

<style scoped>
.book-shell {
  /* 明亮书城风 token：暖纸白底 + 墨色 + 朱砂强调 + 评分金 */
  --book-paper: #faf9f6;
  --book-card: #ffffff;
  --book-field: #f0eee8;
  --book-ink: #26221b;
  --book-ink-2: #6f6a5e;
  --book-ink-3: #a39d8f;
  --book-line: rgba(38, 34, 27, 0.08);
  --book-accent: #c8452c;
  --book-accent-soft: #fdf0ec;
  --book-gold: #d9a441;
  --book-wv-a: #1e5f52;
  --book-wv-b: #0f3d34;
  --book-en-a: #c96f2e;
  --book-en-b: #8f4a1a;
  --book-wr-a: #3b4a6b;
  --book-wr-b: #232f4a;
  --book-radius-sm: 8px;
  --book-radius-md: 14px;
  --book-radius-lg: 22px;
  --book-shadow-soft: 0 14px 34px rgba(38, 34, 27, 0.08);
  --book-shadow-deep: 0 28px 80px rgba(38, 34, 27, 0.28);
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  color: var(--book-ink);
  background:
    radial-gradient(90% 60% at 50% 0%, #f5f0e6 0%, transparent 60%),
    var(--book-paper);
}

.book-topbar {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: calc(40px + env(safe-area-inset-top)) 18px 12px;
  border-bottom: 1px solid var(--book-line);
  background: rgba(250, 249, 246, 0.9);
  backdrop-filter: blur(14px);
}

.book-back {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 0;
  border: 0;
  background: transparent;
  color: var(--book-ink);
  font: inherit;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
}

.book-brand {
  flex: 1;
  min-width: 0;
}

.book-brand small {
  display: block;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.22em;
  color: var(--book-accent);
}

.book-brand h1 {
  margin: 1px 0 0;
  font-family: "Songti SC", "STSong", "SimSun", serif;
  font-size: 26px;
  font-weight: 900;
  line-height: 1.1;
  letter-spacing: 0.02em;
}

.book-topbar-actions {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  gap: 8px;
}

.book-topbar-button {
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  border: 0;
  border-radius: 50%;
  color: #fff;
  background: var(--book-ink);
  font: inherit;
  font-size: 14px;
  cursor: pointer;
  transition: transform 160ms ease;
}

.book-topbar-button.is-quiet {
  border: 1px solid var(--book-line);
  color: var(--book-ink);
  background: var(--book-card);
}

.book-topbar-button:disabled {
  cursor: default;
  opacity: 0.42;
}

.book-topbar-button:not(:disabled):active {
  transform: scale(0.94);
}

.book-main {
  min-height: 0;
  flex: 1;
  display: grid;
  grid-template-columns: minmax(320px, 38%) minmax(0, 1fr);
  gap: 14px;
  padding: 14px;
}

.book-main:not(:has(.book-detail)) {
  grid-template-columns: 1fr;
}

.book-main:not(:has(.book-detail)) .book-shelf {
  width: min(100%, 720px);
  margin: 0 auto;
}

.book-shelf-trigger {
  display: none;
}

@media (max-width: 720px) {
  .book-topbar {
    padding: calc(34px + env(safe-area-inset-top)) 18px 12px;
  }

  .book-brand h1 {
    font-size: 24px;
  }

  .book-main {
    grid-template-columns: 1fr;
    gap: 10px;
    padding: 10px;
  }

  .book-main:not(.is-shelf-open) .book-shelf {
    display: none;
  }

  .book-main.is-shelf-open .book-detail {
    display: none;
  }

  .book-shelf-trigger {
    display: grid;
  }
}
</style>
