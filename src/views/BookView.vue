<script setup>
import { computed, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute, useRouter } from 'vue-router'
import { useBookStore } from '../stores/book'
import { useDialog } from '../composables/useDialog'
import { useI18n } from '../composables/useI18n'
import { pushReturnTarget } from '../lib/navigation-return'
import { BOOK_TEXT_ASSET_TYPES } from '../lib/book-text-schema'

const router = useRouter()
const route = useRoute()
const bookStore = useBookStore()
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

const selectedAssetTypeLabel = computed(() => {
  const type = selectedAsset.value?.assetType || 'reference_note'
  return t(typeLabels[type]?.zh || type, typeLabels[type]?.en || type)
})

const selectedStatusLabel = computed(() => {
  const status = selectedAsset.value?.status || 'draft'
  return t(statusLabels[status]?.zh || status, statusLabels[status]?.en || status)
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

const selectAsset = (assetId) => {
  selectedAssetId.value = assetId
  editMode.value = false
  editGuardVisible.value = false
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

const exportSelected = () => {
  const asset = selectedAsset.value
  if (!asset) return
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
    <header class="book-topbar">
      <button type="button" class="book-back" @click="goBack">
        <i class="fas fa-chevron-left" aria-hidden="true"></i>
        <span>{{ t('返回', 'Back') }}</span>
      </button>
      <div>
        <p>{{ t('文本来源', 'Text Sources') }}</p>
        <h1>{{ t('文本库', 'Book') }}</h1>
      </div>
      <button type="button" class="book-icon-button" :aria-label="t('新建', 'New')" @click="createBlankAsset" data-testid="book-create">
        <i class="fas fa-plus" aria-hidden="true"></i>
      </button>
    </header>

    <main class="book-main">
      <aside class="book-library" data-testid="book-library">
        <div class="book-search-row">
          <i class="fas fa-magnifying-glass" aria-hidden="true"></i>
          <input v-model="searchQuery" type="search" :placeholder="t('搜索文本', 'Search text')" data-testid="book-search" />
        </div>
        <select v-model="typeFilter" class="book-filter" data-testid="book-type-filter">
          <option v-for="option in typeOptions" :key="option.id" :value="option.id">
            {{ option.label }}
          </option>
        </select>

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
          <i class="fas fa-book-open" aria-hidden="true"></i>
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
          <span>
            <strong>{{ asset.title }}</strong>
            <small>{{ asset.content.length }} {{ t('字', 'chars') }}</small>
          </span>
          <i v-if="asset.locked" class="fas fa-lock" aria-hidden="true"></i>
          <i v-else class="fas fa-chevron-right" aria-hidden="true"></i>
        </button>
      </aside>

      <section v-if="selectedAsset" class="book-detail" data-testid="book-detail">
        <div class="book-detail-header">
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
</style>
