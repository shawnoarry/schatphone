<script setup>
import { computed, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute, useRouter } from 'vue-router'
import { useBookStore } from '../stores/book'
import { useSystemStore } from '../stores/system'
import { useDialog } from '../composables/useDialog'
import { useI18n } from '../composables/useI18n'
import { pushReturnTarget } from '../lib/navigation-return'
import { BOOK_TEXT_ASSET_TYPES } from '../lib/book-text-schema'

const router = useRouter()
const route = useRoute()
const bookStore = useBookStore()
const systemStore = useSystemStore()
const { t } = useI18n()
const { confirmDialog } = useDialog()
const { assets } = storeToRefs(bookStore)

const searchQuery = ref('')
const typeFilter = ref('all')
const selectedAssetId = ref(typeof route.query.asset === 'string' ? route.query.asset : '')
const editMode = ref(false)
const editGuardVisible = ref(false)
const importFeedback = ref('')
const importFeedbackTone = ref('info')
const importInput = ref(null)
const aiToolsOpen = ref(false)
const aiToolMode = ref('summary')
const draft = ref({
  title: '',
  assetType: 'worldbook_document',
  tags: '',
  content: '',
})

const typeLabels = {
  worldbook_document: { zh: '世界书文档', en: 'Worldbook' },
  knowledge_note: { zh: '知识笔记', en: 'Knowledge' },
  glossary: { zh: '术语表', en: 'Glossary' },
  rule_set: { zh: '规则集', en: 'Rules' },
  profile_template_note: { zh: '档案模板', en: 'Profile note' },
  reference_note: { zh: '参考资料', en: 'Reference' },
}

const statusLabels = {
  draft: { zh: '草稿', en: 'Draft' },
  active_source: { zh: '启用来源', en: 'Active source' },
  archived: { zh: '归档', en: 'Archived' },
}

const typeOptions = computed(() => [
  { id: 'all', label: t('全部类型', 'All types') },
  ...BOOK_TEXT_ASSET_TYPES.map((type) => ({
    id: type,
    label: t(typeLabels[type]?.zh || type, typeLabels[type]?.en || type),
  })),
])

const filteredAssets = computed(() => {
  const query = searchQuery.value.trim()
  const filters = {
    search: query,
    assetType: typeFilter.value === 'all' ? '' : typeFilter.value,
  }
  return bookStore.listAssets(filters)
})

const selectedAsset = computed(() =>
  bookStore.findAssetById(selectedAssetId.value) || filteredAssets.value[0] || assets.value[0] || null,
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

const selectedAssetTypeLabel = computed(() => {
  const type = selectedAsset.value?.assetType || 'reference_note'
  return t(typeLabels[type]?.zh || type, typeLabels[type]?.en || type)
})

const selectedStatusLabel = computed(() => {
  const status = selectedAsset.value?.status || 'draft'
  return t(statusLabels[status]?.zh || status, statusLabels[status]?.en || status)
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
    draft.value.assetType !== asset.assetType ||
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

const selectAsset = (assetId) => {
  selectedAssetId.value = assetId
  editMode.value = false
  editGuardVisible.value = false
  aiToolsOpen.value = false
}

const hydrateDraft = () => {
  const asset = selectedAsset.value
  draft.value = {
    title: asset?.title || '',
    assetType: asset?.assetType || 'worldbook_document',
    tags: Array.isArray(asset?.tags) ? asset.tags.join(', ') : '',
    content: asset?.content || '',
  }
}

watch(selectedAsset, hydrateDraft, { immediate: true })

const createBlankAsset = () => {
  const asset = bookStore.createAsset({
    title: t('新的文本来源', 'New text source'),
    assetType: 'worldbook_document',
    format: 'markdown',
    content: '# New Source\n\n',
  })
  selectAsset(asset.id)
  editMode.value = true
  aiToolsOpen.value = false
}

const toggleAiTools = () => {
  if (!selectedAsset.value) return
  aiToolsOpen.value = !aiToolsOpen.value
}

const selectAiTool = (toolId) => {
  aiToolMode.value = toolId
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
      assetType: draft.value.assetType,
      tags,
      content: draft.value.content,
      format: draft.value.content.trim().startsWith('#') ? 'markdown' : asset.format,
    },
    { force: true },
  )
  if (result.ok) {
    selectedAssetId.value = result.asset.id
    editMode.value = false
    importFeedbackTone.value = 'success'
    importFeedback.value = t('已保存文本来源。', 'Text source saved.')
  }
}

const triggerImport = () => {
  importInput.value?.click()
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
  importFeedbackTone.value = 'success'
  importFeedback.value = t('已导入文本来源。', 'Text source imported.')
}

const buildExportFileName = (asset) => {
  const safeTitle = String(asset?.title || 'book-source')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64)
  return `${safeTitle || 'book-source'}.worldbook.json`
}

const downloadExportPayload = (asset, payload) => {
  if (
    typeof Blob === 'undefined' ||
    typeof document === 'undefined' ||
    typeof URL === 'undefined' ||
    typeof URL.createObjectURL !== 'function'
  ) {
    return false
  }
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json;charset=utf-8',
  })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = buildExportFileName(asset)
  anchor.rel = 'noopener'
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
  return true
}

const exportSelected = async () => {
  const asset = selectedAsset.value
  if (!asset) return
  const confirmed = await confirmDialog({
    title: t('导出文本来源', 'Export text source'),
    message: t(
      '确认导出当前文本来源吗？导出的文件可在其他设备导入 Book。',
      'Export this text source? The file can be imported into Book on another device.',
    ),
    details: [
      `${t('标题', 'Title')}: ${asset.title}`,
      `${t('字数', 'Chars')}: ${asset.content.length}`,
      `${t('格式', 'Format')}: .worldbook.json`,
    ],
    confirmText: t('导出', 'Export'),
    cancelText: t('取消', 'Cancel'),
    tone: 'accent',
  })
  if (!confirmed) return

  const payload = bookStore.exportAsset(asset.id)
  if (!payload) return
  const downloaded = downloadExportPayload(asset, payload)
  importFeedbackTone.value = 'success'
  importFeedback.value = t('已生成导出数据。', 'Export data prepared.')
  if (downloaded) {
    importFeedback.value = t('已下载文本库导出文件。', 'Book export downloaded.')
  }
}
</script>

<template>
  <div class="book-shell">
    <div class="book-ambient" aria-hidden="true">
      <span class="book-ambient-leaf is-left"></span>
      <span class="book-ambient-leaf is-right"></span>
      <span class="book-ambient-grid"></span>
    </div>
    <header class="book-topbar">
      <button type="button" class="book-back" @click="goBack">
        <i class="fas fa-chevron-left" aria-hidden="true"></i>
        <span>{{ t('返回', 'Back') }}</span>
      </button>
      <div class="book-title-lockup">
        <span class="book-brand-mark" aria-hidden="true">
          <i class="fas fa-book-bookmark"></i>
        </span>
        <div>
          <p>{{ t('文本来源', 'Text Sources') }}</p>
          <h1>{{ t('文本库', 'Book') }}</h1>
        </div>
      </div>
      <div class="book-topbar-actions">
        <button
          type="button"
          class="book-icon-button is-quiet"
          :aria-label="t('Book AI', 'Book AI')"
          :disabled="!selectedAsset"
          @click="toggleAiTools"
          data-testid="book-ai-trigger"
        >
          <i class="fas fa-wand-magic-sparkles" aria-hidden="true"></i>
        </button>
        <button type="button" class="book-icon-button" :aria-label="t('新建', 'New')" @click="createBlankAsset" data-testid="book-create">
          <i class="fas fa-plus" aria-hidden="true"></i>
        </button>
      </div>
    </header>

    <main class="book-main">
      <aside class="book-library" data-testid="book-library">
        <div class="book-library-head">
          <span>{{ t('资料架', 'Shelf') }}</span>
          <strong>{{ filteredAssets.length }}</strong>
        </div>
        <div class="book-search-row">
          <i class="fas fa-magnifying-glass" aria-hidden="true"></i>
          <input v-model="searchQuery" type="search" :placeholder="t('搜索文本', 'Search text')" data-testid="book-search" />
        </div>
        <select v-model="typeFilter" class="book-filter" data-testid="book-type-filter">
          <option v-for="option in typeOptions" :key="option.id" :value="option.id">
            {{ option.label }}
          </option>
        </select>

        <div class="book-category-rail">
          <button
            v-for="option in typeOptions.slice(0, 6)"
            :key="option.id"
            type="button"
            :class="['book-category-button', { 'is-active': typeFilter === option.id }]"
            @click="typeFilter = option.id"
          >
            {{ option.label }}
          </button>
        </div>

        <button type="button" class="book-import-button" @click="triggerImport" data-testid="book-import-trigger">
          <i class="fas fa-file-import" aria-hidden="true"></i>
          <span>{{ t('导入文本', 'Import text') }}</span>
        </button>
        <input
          ref="importInput"
          class="book-hidden-input"
          type="file"
          accept=".txt,.md,.markdown,.json,.worldbook.json"
          data-testid="book-import-input"
          @change="importFile"
        />

        <p v-if="importFeedback" :class="['book-feedback', `is-${importFeedbackTone}`]" data-testid="book-import-feedback">
          {{ importFeedback }}
        </p>

        <div v-if="filteredAssets.length === 0" class="book-empty" data-testid="book-empty">
          <div class="book-empty-visual" aria-hidden="true">
            <span></span>
            <span></span>
            <span></span>
          </div>
          <strong>{{ t('还没有文本来源', 'No text sources yet') }}</strong>
          <span>{{ t('创建或导入世界书、规则、术语和参考资料。', 'Create or import worldbooks, rules, glossary, and references.') }}</span>
        </div>

        <button
          v-for="asset in filteredAssets"
          :key="asset.id"
          type="button"
          :class="['book-list-item', { 'is-active': selectedAsset?.id === asset.id }]"
          :data-testid="`book-asset-${asset.id}`"
          @click="selectAsset(asset.id)"
        >
          <span class="book-list-mark" aria-hidden="true">
            <i class="fas fa-bookmark"></i>
          </span>
          <span class="book-list-copy">
            <strong>{{ asset.title }}</strong>
            <small>{{ t(typeLabels[asset.assetType]?.zh || asset.assetType, typeLabels[asset.assetType]?.en || asset.assetType) }} · {{ asset.content.length }} {{ t('字', 'chars') }}</small>
          </span>
          <i v-if="asset.locked" class="fas fa-lock" aria-hidden="true"></i>
          <i v-else class="fas fa-chevron-right" aria-hidden="true"></i>
        </button>
      </aside>

      <section v-if="selectedAsset" class="book-detail" data-testid="book-detail">
        <div class="book-detail-header">
          <span class="book-detail-seal" aria-hidden="true">
            <i class="fas fa-seedling"></i>
          </span>
          <div>
            <p>{{ selectedAssetTypeLabel }} · {{ selectedStatusLabel }}</p>
            <h2>{{ selectedAsset.title }}</h2>
          </div>
          <div class="book-detail-actions">
            <button type="button" class="book-secondary-button" @click="exportSelected" data-testid="book-export">
              <i class="fas fa-arrow-up-from-bracket" aria-hidden="true"></i>
              <span>{{ t('导出', 'Export') }}</span>
            </button>
            <button v-if="!editMode" type="button" class="book-primary-button" @click="beginEdit" data-testid="book-edit">
              <i class="fas fa-pen" aria-hidden="true"></i>
              <span>{{ t('编辑', 'Edit') }}</span>
            </button>
          </div>
        </div>

        <div class="book-meta-row">
          <span>{{ selectedAsset.content.length }} {{ t('字', 'chars') }}</span>
          <span>{{ selectedSections.length }} {{ t('段落', 'sections') }}</span>
          <span v-if="selectedAsset.locked">{{ t('已锁定', 'Locked') }}</span>
          <span v-if="selectedAsset.status === 'active_source'">{{ t('正在影响世界书', 'Used by WorldBook') }}</span>
        </div>

        <div v-if="selectedWorldBookLinks.length > 0" class="book-usage-card" data-testid="book-worldbook-usage">
          <div>
            <strong>{{ t('正在被 WorldBook 使用', 'Used by WorldBook') }}</strong>
            <span>{{ selectedWorldBookUsageSummary }}</span>
          </div>
          <button type="button" class="book-secondary-button" @click="openWorldBookUsage">
            {{ t('查看启用设置', 'View activation') }}
          </button>
        </div>

        <div v-if="selectedTags.length > 0" class="book-tags">
          <span v-for="tag in selectedTags" :key="tag">{{ tag }}</span>
        </div>

        <div v-if="editGuardVisible" class="book-guard" data-testid="book-edit-guard">
          <strong>{{ t('这是启用或锁定的来源', 'This source is active or locked') }}</strong>
          <p>{{ t('编辑前请确认：保存后可能改变之后的世界书上下文。', 'Confirm before editing: saving may change future WorldBook context.') }}</p>
          <button type="button" class="book-primary-button" @click="confirmGuardedEdit" data-testid="book-edit-guard-confirm">
            {{ t('继续编辑', 'Continue editing') }}
          </button>
        </div>

        <form v-if="editMode" class="book-editor" data-testid="book-editor" @submit.prevent="saveEdit">
          <label>
            <span>{{ t('标题', 'Title') }}</span>
            <input v-model="draft.title" data-testid="book-edit-title" />
          </label>
          <label>
            <span>{{ t('类型', 'Type') }}</span>
            <select v-model="draft.assetType" data-testid="book-edit-type">
              <option v-for="type in BOOK_TEXT_ASSET_TYPES" :key="type" :value="type">
                {{ t(typeLabels[type]?.zh || type, typeLabels[type]?.en || type) }}
              </option>
            </select>
          </label>
          <label>
            <span>{{ t('标签', 'Tags') }}</span>
            <input v-model="draft.tags" data-testid="book-edit-tags" />
          </label>
          <label class="book-editor-content">
            <span>{{ t('内容', 'Content') }}</span>
            <textarea v-model="draft.content" data-testid="book-edit-content"></textarea>
          </label>
          <div class="book-editor-actions">
            <button type="button" class="book-secondary-button" @click="cancelEdit" data-testid="book-cancel">
              {{ t('取消', 'Cancel') }}
            </button>
            <button type="submit" class="book-primary-button" data-testid="book-save">
              {{ t('保存', 'Save') }}
            </button>
          </div>
        </form>

        <div v-else class="book-read-mode" data-testid="book-read-mode">
          <div v-if="selectedSections.length > 0" class="book-outline">
            <strong>{{ t('目录', 'Outline') }}</strong>
            <span v-for="section in selectedSections" :key="section.id">
              {{ section.title }}
            </span>
          </div>
          <pre>{{ selectedAsset.content }}</pre>
        </div>
      </section>
    </main>

    <div v-if="selectedAsset && aiToolsOpen" class="book-ai-backdrop" @click="aiToolsOpen = false"></div>
    <section v-if="selectedAsset && aiToolsOpen" class="book-ai-sheet" data-testid="book-ai-sheet" aria-live="polite">
      <div class="book-ai-handle"></div>
      <div class="book-ai-head">
        <div>
          <p>{{ t('Book AI', 'Book AI') }}</p>
          <h2>{{ selectedAsset.title }}</h2>
        </div>
        <button type="button" class="book-icon-button is-quiet" :aria-label="t('关闭', 'Close')" @click="aiToolsOpen = false">
          <i class="fas fa-xmark" aria-hidden="true"></i>
        </button>
      </div>
      <div class="book-ai-tools">
        <button
          v-for="tool in aiToolOptions"
          :key="tool.id"
          type="button"
          :class="['book-ai-tool', { 'is-active': aiToolMode === tool.id }]"
          :data-testid="`book-ai-tool-${tool.id}`"
          @click="selectAiTool(tool.id)"
        >
          <i :class="tool.icon" aria-hidden="true"></i>
          <span>{{ tool.label }}</span>
        </button>
      </div>
      <pre class="book-ai-result" data-testid="book-ai-result">{{ aiToolResultText }}</pre>
    </section>
  </div>
</template>

<style scoped>
.book-shell {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  color: #14171c;
  background:
    linear-gradient(180deg, rgba(247, 248, 250, 0.94), rgba(230, 235, 240, 0.96)),
    radial-gradient(circle at 12% 8%, rgba(111, 143, 179, 0.2), transparent 34%);
}

.book-topbar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: calc(40px + env(safe-area-inset-top)) 18px 14px;
  border-bottom: 1px solid rgba(145, 157, 172, 0.28);
  background: rgba(255, 255, 255, 0.72);
  backdrop-filter: blur(18px);
}

.book-topbar > div {
  min-width: 0;
  flex: 1;
}

.book-topbar p {
  margin: 0;
  color: #6a7380;
  font-size: 11px;
  font-weight: 700;
}

.book-topbar h1 {
  margin: 1px 0 0;
  font-size: 24px;
  line-height: 1.1;
}

.book-back,
.book-icon-button,
.book-primary-button,
.book-secondary-button,
.book-import-button {
  border: 0;
  cursor: pointer;
  font: inherit;
}

.book-back {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #2466a8;
  background: transparent;
  font-size: 14px;
  font-weight: 700;
}

.book-icon-button {
  width: 38px;
  height: 38px;
  border-radius: 12px;
  color: white;
  background: #2b6f9f;
}

.book-main {
  min-height: 0;
  flex: 1;
  display: grid;
  grid-template-columns: minmax(180px, 34%) 1fr;
  gap: 14px;
  padding: 14px;
}

.book-library,
.book-detail {
  min-height: 0;
  overflow: auto;
  border: 1px solid rgba(145, 157, 172, 0.24);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.82);
  box-shadow: 0 18px 45px rgba(29, 43, 59, 0.08);
}

.book-library {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px;
}

.book-search-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 12px;
  border-radius: 12px;
  background: #eef2f6;
}

.book-search-row input,
.book-filter,
.book-editor input,
.book-editor select,
.book-editor textarea {
  width: 100%;
  border: 0;
  outline: none;
  color: #14171c;
  background: transparent;
  font: inherit;
}

.book-search-row input {
  height: 40px;
}

.book-filter {
  height: 40px;
  padding: 0 10px;
  border-radius: 12px;
  background: #eef2f6;
}

.book-import-button,
.book-list-item,
.book-primary-button,
.book-secondary-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 800;
}

.book-import-button {
  min-height: 40px;
  color: #245985;
  background: #dbeaf5;
}

.book-hidden-input {
  display: none;
}

.book-feedback {
  margin: 0;
  padding: 9px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 700;
}

.book-feedback.is-success {
  color: #176144;
  background: #dff5ea;
}

.book-feedback.is-error {
  color: #9c2525;
  background: #fee2e2;
}

.book-empty {
  display: grid;
  place-items: center;
  gap: 8px;
  min-height: 180px;
  padding: 18px;
  color: #606b78;
  text-align: center;
}

.book-empty i {
  font-size: 26px;
  color: #2b6f9f;
}

.book-empty strong {
  color: #1c232b;
}

.book-list-item {
  justify-content: space-between;
  min-height: 58px;
  padding: 10px 12px;
  color: #1c232b;
  text-align: left;
  background: #f6f8fa;
}

.book-list-item.is-active {
  color: #0f416b;
  background: #dcecf8;
}

.book-list-item span {
  min-width: 0;
  display: grid;
  gap: 3px;
}

.book-list-item strong,
.book-list-item small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.book-list-item small {
  color: #687482;
  font-size: 11px;
}

.book-detail {
  padding: 16px;
}

.book-detail-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.book-detail-header p,
.book-detail-header h2 {
  margin: 0;
}

.book-detail-header p {
  color: #6a7380;
  font-size: 12px;
  font-weight: 800;
}

.book-detail-header h2 {
  margin-top: 3px;
  font-size: 24px;
  line-height: 1.16;
}

.book-detail-actions,
.book-editor-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.book-primary-button,
.book-secondary-button {
  min-height: 38px;
  padding: 0 13px;
}

.book-primary-button {
  color: white;
  background: #1f6b9c;
}

.book-secondary-button {
  color: #1f4f78;
  background: #e7eef5;
}

.book-meta-row,
.book-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}

.book-meta-row span,
.book-tags span {
  padding: 5px 8px;
  border-radius: 10px;
  color: #536171;
  background: #eef2f6;
  font-size: 12px;
  font-weight: 800;
}

.book-usage-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 12px;
  padding: 12px;
  border: 1px solid var(--system-control-border);
  border-radius: var(--system-radius-md);
  background: var(--system-surface-muted);
}

.book-usage-card div {
  display: grid;
  gap: 3px;
  min-width: 0;
}

.book-usage-card strong {
  color: var(--system-text);
  font-size: 13px;
}

.book-usage-card span {
  color: var(--system-text-muted);
  font-size: 12px;
}

.book-guard {
  margin-top: 14px;
  padding: 13px;
  border: 1px solid #f1c977;
  border-radius: 14px;
  background: #fff4d7;
}

.book-guard p {
  margin: 6px 0 12px;
  color: #7a5a17;
  font-size: 13px;
}

.book-editor {
  display: grid;
  gap: 12px;
  margin-top: 14px;
}

.book-editor label {
  display: grid;
  gap: 6px;
  color: #536171;
  font-size: 12px;
  font-weight: 800;
}

.book-editor input,
.book-editor select,
.book-editor textarea {
  min-height: 42px;
  padding: 9px 11px;
  border: 1px solid rgba(145, 157, 172, 0.24);
  border-radius: 12px;
  background: #f7f9fb;
}

.book-editor textarea {
  min-height: 240px;
  resize: vertical;
  line-height: 1.55;
}

.book-read-mode {
  display: grid;
  gap: 14px;
  margin-top: 14px;
}

.book-outline {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 10px;
  border-radius: 14px;
  background: #eef5fa;
}

.book-outline strong,
.book-outline span {
  padding: 5px 8px;
  border-radius: 9px;
  background: white;
  font-size: 12px;
}

.book-read-mode pre {
  min-height: 240px;
  margin: 0;
  padding: 16px;
  overflow: auto;
  border-radius: 14px;
  color: #18202a;
  background: #f8fafc;
  white-space: pre-wrap;
  word-break: break-word;
  line-height: 1.62;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 13px;
}

@media (max-width: 720px) {
  .book-main {
    grid-template-columns: 1fr;
    overflow: auto;
  }

  .book-library,
  .book-detail {
    overflow: visible;
  }

  .book-detail-header {
    display: grid;
  }
}

.book-shell {
  --book-sage: #B0BC98;
  --book-stone: #C7CCB9;
  --book-leaf: #CAE2BC;
  --book-ink: #46351D;
  --book-ink-soft: rgba(70, 53, 29, 0.68);
  --book-paper: #F7F8F1;
  --book-paper-strong: #FBFCF6;
  --book-line: rgba(70, 53, 29, 0.14);
  --book-shadow: 0 20px 52px rgba(70, 53, 29, 0.12);
  position: relative;
  overflow: hidden;
  color: var(--book-ink);
  background:
    radial-gradient(circle at 18% 6%, rgba(202, 226, 188, 0.48), transparent 34%),
    linear-gradient(155deg, #f8faf2 0%, #eef2e8 45%, #dde3d0 100%);
}

.book-topbar {
  border-bottom: 1px solid var(--book-line);
  background: rgba(247, 248, 241, 0.82);
  box-shadow: 0 10px 28px rgba(70, 53, 29, 0.08);
}

.book-topbar > div {
  min-width: 0;
}

.book-topbar-actions {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
}

.book-topbar p {
  color: var(--book-ink-soft);
  letter-spacing: 0;
}

.book-topbar h1 {
  color: var(--book-ink);
  letter-spacing: 0;
}

.book-back {
  color: var(--book-ink);
}

.book-icon-button {
  display: inline-grid;
  flex: 0 0 auto;
  place-items: center;
  border: 1px solid rgba(70, 53, 29, 0.18);
  color: var(--book-leaf);
  background: var(--book-ink);
  box-shadow: 0 10px 20px rgba(70, 53, 29, 0.16);
  transition:
    transform 160ms ease,
    border-color 160ms ease,
    background 160ms ease;
}

.book-icon-button.is-quiet {
  color: var(--book-ink);
  background: rgba(251, 252, 246, 0.72);
  box-shadow: none;
}

.book-icon-button:disabled {
  cursor: default;
  opacity: 0.42;
}

.book-icon-button:not(:disabled):active,
.book-primary-button:active,
.book-secondary-button:active,
.book-import-button:active,
.book-list-item:active,
.book-category-button:active,
.book-ai-tool:active {
  transform: scale(0.985);
}

.book-main {
  grid-template-columns: minmax(188px, 32%) minmax(0, 1fr);
  gap: 12px;
  padding: 12px;
}

.book-library,
.book-detail {
  border: 1px solid var(--book-line);
  background: rgba(251, 252, 246, 0.78);
  box-shadow: var(--book-shadow);
  backdrop-filter: blur(18px);
}

.book-library {
  gap: 9px;
  padding: 10px;
  background: rgba(199, 204, 185, 0.46);
}

.book-search-row,
.book-filter,
.book-editor input,
.book-editor select,
.book-editor textarea {
  border: 1px solid rgba(70, 53, 29, 0.11);
  color: var(--book-ink);
  background: rgba(251, 252, 246, 0.74);
  box-shadow: inset 0 1px 0 rgba(251, 252, 246, 0.68);
}

.book-search-row {
  min-height: 40px;
  color: var(--book-ink-soft);
}

.book-filter {
  flex-shrink: 0;
  color: var(--book-ink-soft);
}

.book-category-rail {
  display: flex;
  gap: 7px;
  padding: 2px 0;
  overflow-x: auto;
  scrollbar-width: none;
}

.book-category-rail::-webkit-scrollbar {
  display: none;
}

.book-category-button {
  min-height: 30px;
  flex: 0 0 auto;
  border: 1px solid rgba(70, 53, 29, 0.12);
  border-radius: 999px;
  padding: 0 10px;
  color: var(--book-ink-soft);
  background: rgba(251, 252, 246, 0.58);
  font: inherit;
  font-size: 11px;
  font-weight: 800;
}

.book-category-button.is-active {
  color: var(--book-leaf);
  background: var(--book-ink);
}

.book-import-button {
  border: 1px solid rgba(70, 53, 29, 0.14);
  color: var(--book-ink);
  background: linear-gradient(180deg, rgba(202, 226, 188, 0.92), rgba(176, 188, 152, 0.86));
}

.book-feedback {
  border: 1px solid rgba(70, 53, 29, 0.12);
}

.book-feedback.is-success {
  color: #37512a;
  background: rgba(202, 226, 188, 0.7);
}

.book-feedback.is-error {
  color: #7c2525;
  background: rgba(253, 231, 225, 0.86);
}

.book-empty {
  color: var(--book-ink-soft);
}

.book-empty i,
.book-empty strong {
  color: var(--book-ink);
}

.book-list-item {
  border: 1px solid transparent;
  color: var(--book-ink);
  background: rgba(251, 252, 246, 0.62);
  box-shadow: none;
  transition:
    border-color 160ms ease,
    background 160ms ease,
    transform 160ms ease;
}

.book-list-item:hover {
  border-color: rgba(70, 53, 29, 0.16);
  background: rgba(251, 252, 246, 0.86);
}

.book-list-item.is-active {
  border-color: rgba(70, 53, 29, 0.24);
  color: var(--book-ink);
  background: linear-gradient(180deg, rgba(202, 226, 188, 0.9), rgba(176, 188, 152, 0.72));
}

.book-list-item small {
  color: var(--book-ink-soft);
}

.book-detail {
  padding: 18px;
  background:
    linear-gradient(180deg, rgba(251, 252, 246, 0.9), rgba(247, 248, 241, 0.82)),
    linear-gradient(90deg, rgba(202, 226, 188, 0.18), transparent 34%);
}

.book-detail-header p {
  color: var(--book-ink-soft);
}

.book-detail-header h2 {
  max-width: 18ch;
  color: var(--book-ink);
}

.book-primary-button,
.book-secondary-button {
  border: 1px solid rgba(70, 53, 29, 0.14);
  transition:
    transform 160ms ease,
    background 160ms ease,
    border-color 160ms ease;
}

.book-primary-button {
  color: var(--book-leaf);
  background: var(--book-ink);
  box-shadow: 0 12px 24px rgba(70, 53, 29, 0.14);
}

.book-secondary-button {
  color: var(--book-ink);
  background: rgba(199, 204, 185, 0.34);
}

.book-meta-row span,
.book-tags span {
  color: var(--book-ink);
  background: rgba(199, 204, 185, 0.36);
}

.book-usage-card {
  border-color: rgba(70, 53, 29, 0.14);
  background: rgba(202, 226, 188, 0.42);
}

.book-usage-card strong {
  color: var(--book-ink);
}

.book-usage-card span {
  color: var(--book-ink-soft);
}

.book-guard {
  border-color: rgba(70, 53, 29, 0.18);
  color: var(--book-ink);
  background: rgba(202, 226, 188, 0.42);
}

.book-guard p {
  color: var(--book-ink-soft);
}

.book-editor {
  padding: 12px;
  border: 1px solid rgba(70, 53, 29, 0.12);
  border-radius: 16px;
  background: rgba(251, 252, 246, 0.64);
}

.book-editor label {
  color: var(--book-ink-soft);
}

.book-editor textarea {
  min-height: 280px;
}

.book-read-mode {
  gap: 12px;
}

.book-outline {
  border: 1px solid rgba(70, 53, 29, 0.1);
  background: rgba(199, 204, 185, 0.26);
}

.book-outline strong,
.book-outline span {
  color: var(--book-ink);
  background: rgba(251, 252, 246, 0.74);
}

.book-read-mode pre {
  min-height: 360px;
  border: 1px solid rgba(70, 53, 29, 0.1);
  color: var(--book-ink);
  background:
    linear-gradient(90deg, rgba(199, 204, 185, 0.18) 1px, transparent 1px) 0 0 / 28px 100%,
    rgba(251, 252, 246, 0.86);
  font-family: ui-serif, Georgia, Cambria, "Times New Roman", serif;
  font-size: 14px;
}

.book-ai-backdrop {
  position: absolute;
  inset: 0;
  z-index: 20;
  background: rgba(70, 53, 29, 0.12);
}

.book-ai-sheet {
  position: absolute;
  left: 12px;
  right: 12px;
  bottom: calc(12px + env(safe-area-inset-bottom));
  z-index: 21;
  display: grid;
  gap: 12px;
  max-height: min(420px, 58%);
  padding: 10px 14px 14px;
  border: 1px solid rgba(70, 53, 29, 0.18);
  border-radius: 24px;
  color: var(--book-ink);
  background: rgba(251, 252, 246, 0.96);
  box-shadow: 0 -24px 58px rgba(70, 53, 29, 0.18);
  backdrop-filter: blur(22px);
}

.book-ai-handle {
  width: 42px;
  height: 5px;
  border-radius: 999px;
  justify-self: center;
  background: rgba(70, 53, 29, 0.2);
}

.book-ai-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}

.book-ai-head p,
.book-ai-head h2 {
  margin: 0;
}

.book-ai-head p {
  color: var(--book-ink-soft);
  font-size: 11px;
  font-weight: 800;
}

.book-ai-head h2 {
  margin-top: 2px;
  font-size: 18px;
  line-height: 1.2;
}

.book-ai-tools {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
}

.book-ai-tool {
  display: grid;
  gap: 6px;
  justify-items: center;
  min-height: 62px;
  border: 1px solid rgba(70, 53, 29, 0.12);
  border-radius: 15px;
  color: var(--book-ink);
  background: rgba(199, 204, 185, 0.26);
  font: inherit;
  font-size: 12px;
  font-weight: 800;
}

.book-ai-tool.is-active {
  color: var(--book-leaf);
  background: var(--book-ink);
}

.book-ai-result {
  min-height: 86px;
  max-height: 150px;
  margin: 0;
  overflow: auto;
  border: 1px solid rgba(70, 53, 29, 0.1);
  border-radius: 16px;
  padding: 12px;
  color: var(--book-ink);
  background: rgba(202, 226, 188, 0.24);
  white-space: pre-wrap;
  word-break: break-word;
  font: inherit;
  font-size: 13px;
  line-height: 1.5;
}

@media (max-width: 720px) {
  .book-shell {
    overflow: auto;
  }

  .book-main {
    grid-template-columns: 1fr;
    gap: 10px;
    padding: 10px;
    overflow: auto;
  }

  .book-library {
    max-height: 48vh;
    overflow: auto;
  }

  .book-detail {
    min-height: 58vh;
    overflow: auto;
  }

  .book-category-rail {
    display: none;
  }

  .book-read-mode pre {
    min-height: 280px;
  }

  .book-ai-tools {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .book-ai-sheet {
    max-height: 64%;
  }
}

/* Book A1 visual lift: botanical archive, stronger app identity. */
.book-shell {
  --book-paper: #F5F7EC;
  --book-paper-strong: #FBFCF4;
  --book-shadow-deep: 0 26px 70px rgba(70, 53, 29, 0.18);
  --book-shadow-soft: 0 14px 34px rgba(70, 53, 29, 0.1);
  isolation: isolate;
  background:
    linear-gradient(90deg, rgba(70, 53, 29, 0.035) 0 1px, transparent 1px 100%) 0 0 / 26px 26px,
    linear-gradient(180deg, #fbfcf4 0%, #edf3e4 46%, #dfe7d3 100%);
}

.book-ambient {
  position: absolute;
  inset: 0;
  z-index: 0;
  overflow: hidden;
  pointer-events: none;
}

.book-ambient-grid {
  position: absolute;
  inset: 112px 22px 70px;
  border: 1px solid rgba(70, 53, 29, 0.06);
  border-radius: 36px;
  background:
    linear-gradient(90deg, rgba(70, 53, 29, 0.04) 0 1px, transparent 1px 100%) 0 0 / 38px 38px,
    linear-gradient(180deg, rgba(70, 53, 29, 0.035) 0 1px, transparent 1px 100%) 0 0 / 38px 38px;
  opacity: 0.42;
}

.book-ambient-leaf {
  position: absolute;
  width: 170px;
  height: 250px;
  border: 1px solid rgba(70, 53, 29, 0.08);
  border-radius: 68% 0 68% 0;
  background: linear-gradient(135deg, rgba(202, 226, 188, 0.34), rgba(176, 188, 152, 0.08));
  opacity: 0.62;
}

.book-ambient-leaf::after {
  content: "";
  position: absolute;
  inset: 22px 50% 22px auto;
  width: 1px;
  background: rgba(70, 53, 29, 0.1);
  transform: rotate(18deg);
}

.book-ambient-leaf.is-left {
  left: -86px;
  top: 168px;
  transform: rotate(-18deg);
}

.book-ambient-leaf.is-right {
  right: -92px;
  bottom: 108px;
  transform: rotate(164deg);
}

.book-topbar,
.book-main,
.book-ai-backdrop,
.book-ai-sheet {
  position: relative;
  z-index: 1;
}

.book-topbar {
  padding-right: 20px;
  background: linear-gradient(180deg, rgba(251, 252, 244, 0.92), rgba(245, 247, 236, 0.82));
}

.book-title-lockup {
  display: flex;
  align-items: center;
  gap: 12px;
}

.book-title-lockup > div {
  min-width: 0;
}

.book-brand-mark {
  display: grid;
  flex: 0 0 auto;
  place-items: center;
  width: 48px;
  height: 58px;
  border: 1px solid rgba(70, 53, 29, 0.16);
  border-radius: 18px 18px 10px 10px;
  color: var(--book-leaf);
  background:
    linear-gradient(90deg, rgba(202, 226, 188, 0.22) 0 8px, transparent 8px),
    linear-gradient(155deg, #5a4426, var(--book-ink));
  box-shadow:
    inset 0 1px 0 rgba(251, 252, 244, 0.18),
    0 16px 28px rgba(70, 53, 29, 0.18);
}

.book-title-lockup h1 {
  font-size: 34px;
  font-weight: 900;
  white-space: nowrap;
}

.book-back {
  gap: 7px;
  padding: 8px 0;
}

.book-icon-button {
  width: 44px;
  height: 44px;
  border-radius: 17px;
}

.book-main {
  grid-template-columns: minmax(220px, 34%) minmax(0, 1fr);
  gap: 16px;
  padding: 18px;
}

.book-main:not(:has(.book-detail)) {
  grid-template-columns: 1fr;
}

.book-main:not(:has(.book-detail)) .book-library {
  width: min(100%, 680px);
  margin: 0 auto;
}

.book-library,
.book-detail {
  border-color: rgba(70, 53, 29, 0.16);
  border-radius: 30px;
  background:
    linear-gradient(180deg, rgba(251, 252, 244, 0.9), rgba(239, 244, 230, 0.78)),
    var(--book-paper);
  box-shadow: var(--book-shadow-soft);
}

.book-library {
  position: relative;
  gap: 12px;
  padding: 18px;
}

.book-library::before {
  content: "";
  position: absolute;
  left: 18px;
  right: 18px;
  bottom: 18px;
  height: 24px;
  border-radius: 999px;
  background: linear-gradient(180deg, rgba(70, 53, 29, 0.08), transparent);
  opacity: 0.35;
  pointer-events: none;
}

.book-library-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 34px;
  color: var(--book-ink);
}

.book-library-head span {
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 0;
}

.book-library-head strong {
  display: grid;
  place-items: center;
  min-width: 34px;
  height: 28px;
  border: 1px solid rgba(70, 53, 29, 0.14);
  border-radius: 999px;
  color: var(--book-ink);
  background: rgba(202, 226, 188, 0.45);
  font-size: 13px;
}

.book-search-row,
.book-filter {
  min-height: 50px;
  border: 1px solid rgba(70, 53, 29, 0.12);
  border-radius: 18px;
  background: rgba(251, 252, 244, 0.78);
  box-shadow: inset 0 1px 0 rgba(251, 252, 244, 0.86);
}

.book-search-row i {
  color: rgba(70, 53, 29, 0.62);
  font-size: 18px;
}

.book-filter {
  padding-inline: 14px;
}

.book-import-button {
  min-height: 50px;
  border: 1px solid rgba(70, 53, 29, 0.18);
  border-radius: 18px;
  color: var(--book-ink);
  background: linear-gradient(180deg, rgba(202, 226, 188, 0.86), rgba(176, 188, 152, 0.72));
  box-shadow: inset 0 1px 0 rgba(251, 252, 244, 0.62);
}

.book-empty {
  position: relative;
  min-height: 320px;
  padding: 30px 24px;
  border: 1px dashed rgba(70, 53, 29, 0.2);
  border-radius: 28px;
  background:
    linear-gradient(180deg, rgba(251, 252, 244, 0.68), rgba(199, 204, 185, 0.28)),
    linear-gradient(90deg, rgba(70, 53, 29, 0.04) 0 1px, transparent 1px 100%) 0 0 / 22px 22px;
}

.book-empty-visual {
  position: relative;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  gap: 8px;
  width: 142px;
  height: 104px;
  margin-bottom: 4px;
}

.book-empty-visual::before {
  content: "";
  position: absolute;
  left: 4px;
  right: 4px;
  bottom: 4px;
  height: 10px;
  border-radius: 999px;
  background: rgba(70, 53, 29, 0.16);
}

.book-empty-visual span {
  position: relative;
  z-index: 1;
  width: 30px;
  border: 1px solid rgba(70, 53, 29, 0.18);
  border-radius: 9px 9px 5px 5px;
  background: linear-gradient(180deg, #fbfcf4, var(--book-stone));
  box-shadow: 0 12px 20px rgba(70, 53, 29, 0.12);
}

.book-empty-visual span:nth-child(1) {
  height: 74px;
  transform: rotate(-6deg);
}

.book-empty-visual span:nth-child(2) {
  height: 94px;
  background: linear-gradient(180deg, var(--book-leaf), var(--book-sage));
}

.book-empty-visual span:nth-child(3) {
  height: 64px;
  transform: rotate(5deg);
}

.book-list-item {
  display: grid;
  grid-template-columns: 38px minmax(0, 1fr) 18px;
  min-height: 76px;
  padding: 12px;
  border: 1px solid rgba(70, 53, 29, 0.1);
  border-radius: 22px;
  background: rgba(251, 252, 244, 0.62);
  box-shadow: inset 0 1px 0 rgba(251, 252, 244, 0.72);
}

.book-list-item:hover {
  border-color: rgba(70, 53, 29, 0.2);
  background: rgba(251, 252, 244, 0.86);
}

.book-list-item.is-active {
  border-color: rgba(70, 53, 29, 0.24);
  color: var(--book-ink);
  background: linear-gradient(180deg, rgba(202, 226, 188, 0.62), rgba(176, 188, 152, 0.36));
}

.book-list-mark {
  display: grid;
  place-items: center;
  width: 32px;
  height: 48px;
  border-radius: 11px 11px 7px 7px;
  color: var(--book-ink);
  background:
    linear-gradient(90deg, rgba(251, 252, 244, 0.36) 0 7px, transparent 7px),
    var(--book-stone);
}

.book-list-item.is-active .book-list-mark {
  color: var(--book-leaf);
  background:
    linear-gradient(90deg, rgba(202, 226, 188, 0.22) 0 7px, transparent 7px),
    var(--book-ink);
}

.book-list-copy {
  align-self: center;
}

.book-list-copy strong {
  font-size: 14px;
  line-height: 1.15;
}

.book-list-copy small {
  color: rgba(70, 53, 29, 0.62);
  font-size: 11px;
}

.book-detail {
  position: relative;
  padding: 22px;
  background:
    linear-gradient(90deg, rgba(70, 53, 29, 0.08) 0 1px, transparent 1px) 54px 0 / 1px 100% no-repeat,
    linear-gradient(180deg, rgba(251, 252, 244, 0.96), rgba(245, 247, 236, 0.88));
  box-shadow: var(--book-shadow-deep);
}

.book-detail::before {
  content: "";
  position: absolute;
  top: 0;
  right: 34px;
  width: 46px;
  height: 58px;
  border-radius: 0 0 14px 14px;
  background: linear-gradient(180deg, var(--book-leaf), var(--book-sage));
  box-shadow: 0 10px 18px rgba(70, 53, 29, 0.12);
  opacity: 0.8;
}

.book-detail-header {
  display: grid;
  grid-template-columns: 46px minmax(0, 1fr) auto;
  align-items: flex-start;
  gap: 12px;
}

.book-detail-seal {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border: 1px solid rgba(70, 53, 29, 0.14);
  border-radius: 16px;
  color: var(--book-ink);
  background: rgba(202, 226, 188, 0.56);
}

.book-detail-header h2 {
  max-width: 13ch;
  font-size: 30px;
  font-weight: 900;
}

.book-detail-actions {
  padding-right: 60px;
}

.book-primary-button,
.book-secondary-button {
  border-radius: 16px;
}

.book-primary-button {
  color: var(--book-leaf);
  background: linear-gradient(180deg, #574124, var(--book-ink));
  box-shadow: 0 12px 22px rgba(70, 53, 29, 0.16);
}

.book-secondary-button {
  border: 1px solid rgba(70, 53, 29, 0.12);
  color: var(--book-ink);
  background: rgba(251, 252, 244, 0.7);
}

.book-meta-row span,
.book-tags span {
  border: 1px solid rgba(70, 53, 29, 0.1);
  color: rgba(70, 53, 29, 0.72);
  background: rgba(199, 204, 185, 0.28);
}

.book-outline {
  border: 1px solid rgba(70, 53, 29, 0.1);
  background: rgba(202, 226, 188, 0.24);
}

.book-outline strong,
.book-outline span {
  color: var(--book-ink);
  background: rgba(251, 252, 244, 0.78);
}

.book-read-mode pre,
.book-editor textarea {
  border: 1px solid rgba(70, 53, 29, 0.12);
  border-radius: 24px;
  color: var(--book-ink);
  background:
    linear-gradient(180deg, rgba(70, 53, 29, 0.045) 0 1px, transparent 1px) 0 31px / 100% 32px,
    linear-gradient(180deg, #fbfcf4, #f6f8ef);
  box-shadow: inset 0 1px 0 rgba(251, 252, 244, 0.86);
  line-height: 1.78;
}

.book-read-mode pre {
  min-height: 360px;
  padding: 24px 24px 24px 32px;
  font-family: "Iowan Old Style", "Songti SC", "Noto Serif SC", Georgia, serif;
  font-size: 14px;
}

.book-editor input,
.book-editor select {
  border-radius: 16px;
  border-color: rgba(70, 53, 29, 0.12);
  background: rgba(251, 252, 244, 0.78);
}

.book-ai-backdrop {
  background: rgba(70, 53, 29, 0.26);
}

.book-ai-sheet {
  border-color: rgba(70, 53, 29, 0.18);
  border-radius: 30px 30px 0 0;
  background:
    linear-gradient(180deg, rgba(251, 252, 244, 0.98), rgba(232, 239, 221, 0.96)),
    var(--book-paper);
}

.book-ai-handle {
  background: rgba(70, 53, 29, 0.22);
}

.book-ai-tool {
  border-radius: 18px;
  background: rgba(251, 252, 244, 0.72);
}

.book-ai-tool.is-active {
  color: var(--book-leaf);
  background: var(--book-ink);
}

.book-ai-result {
  border-color: rgba(70, 53, 29, 0.12);
  background:
    linear-gradient(180deg, rgba(202, 226, 188, 0.34), rgba(251, 252, 244, 0.72));
}

@media (max-width: 720px) {
  .book-ambient-grid {
    inset: 118px 10px 42px;
    border-radius: 28px;
  }

  .book-topbar {
    align-items: center;
    padding: calc(34px + env(safe-area-inset-top)) 18px 16px;
  }

  .book-title-lockup {
    gap: 10px;
  }

  .book-brand-mark {
    width: 42px;
    height: 50px;
    border-radius: 16px 16px 9px 9px;
  }

  .book-title-lockup h1 {
    font-size: 30px;
  }

  .book-main {
    display: flex;
    flex-direction: column;
    flex: 0 0 auto;
    gap: 12px;
    padding: 12px;
    overflow: visible;
  }

  .book-main:not(:has(.book-detail)) .book-library,
  .book-library {
    width: auto;
    max-height: none;
    margin: 0;
  }

  .book-library,
  .book-detail {
    flex: 0 0 auto;
    border-radius: 28px;
    overflow: visible;
  }

  .book-empty {
    min-height: 420px;
  }

  .book-detail {
    padding: 18px;
  }

  .book-detail::before {
    right: 26px;
  }

  .book-detail-header {
    grid-template-columns: 42px minmax(0, 1fr);
  }

  .book-detail-actions {
    grid-column: 1 / -1;
    padding-right: 0;
  }

  .book-detail-header h2 {
    max-width: 100%;
    font-size: 26px;
  }

  .book-read-mode pre {
    min-height: 340px;
  }
}
</style>
