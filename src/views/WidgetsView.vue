<script setup>
import { computed, onBeforeUnmount, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute, useRouter } from 'vue-router'
import { useSystemStore } from '../stores/system'
import { useDialog } from '../composables/useDialog'
import { useI18n } from '../composables/useI18n'
import {
  buildRouteWithReturnSource,
  normalizeHomePageQuery,
  pushReturnTarget,
  resolveReturnLabel,
} from '../lib/navigation-return'
import { VALID_WIDGET_SIZES } from '../lib/widget-schema'

const CUSTOM_SIZE_OPTIONS = [...VALID_WIDGET_SIZES]
const BUILT_IN_WIDGET_OPTIONS = [
  { id: 'weather', size: '2x2', icon: 'fas fa-cloud-sun' },
  { id: 'calendar', size: '2x2', icon: 'fas fa-calendar-days' },
  { id: 'music', size: '4x2', icon: 'fas fa-music' },
  { id: 'system', size: '2x2', icon: 'fas fa-sliders' },
  { id: 'quick_heart', size: '1x1', icon: 'fas fa-heart' },
  { id: 'quick_disc', size: '1x1', icon: 'fas fa-compact-disc' },
]

const WIDGET_TEMPLATE_CODE = `<style>
  .widget-card {
    width: 100%;
    height: 100%;
    border-radius: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(255, 255, 255, 0.2);
    color: #fff;
    font: 600 14px/1.4 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  }
</style>
<div class="widget-card">My Custom Widget</div>`

const router = useRouter()
const route = useRoute()
const systemStore = useSystemStore()
const { settings } = storeToRefs(systemStore)
const { t } = useI18n()
const { confirmDialog } = useDialog()

const activePanel = ref('library')
const saved = ref(false)
const templateCopied = ref(false)
const customWidgetName = ref('')
const customWidgetSize = ref('2x2')
const customWidgetCode = ref('')
const editingWidgetId = ref('')
const importJsonText = ref('')
const importFeedbackType = ref('')
const importFeedbackMessage = ref('')
const importFeedbackDetails = ref([])

let savedTimerId = null
let copiedTimerId = null

const panels = computed(() => [
  { id: 'library', label: t('组件库', 'Library'), icon: 'fas fa-table-cells-large' },
  { id: 'custom', label: t('自定义', 'Custom'), icon: 'fas fa-code' },
  { id: 'import', label: t('导入', 'Import'), icon: 'fas fa-file-import' },
])

const customWidgets = computed(() => settings.value.appearance.customWidgets || [])
const homeWidgetPages = computed(() => settings.value.appearance.homeWidgetPages || [])
const hasCustomWidgets = computed(() => customWidgets.value.length > 0)
const editingCustomWidget = computed(() =>
  customWidgets.value.find((widget) => widget.id === editingWidgetId.value) || null,
)
const editingWidgetIsPlaced = computed(() =>
  Boolean(
    editingWidgetId.value &&
      homeWidgetPages.value.some((page) => Array.isArray(page) && page.includes(editingWidgetId.value)),
  ),
)
const returnLabelKey = computed(() => resolveReturnLabel(route, 'Home'))
const returnButtonLabel = computed(() =>
  returnLabelKey.value === 'Settings' ? t('设置', 'Settings') : t('主页', 'Home'),
)
const returnHomePage = computed(() => normalizeHomePageQuery(route.query.homePage))

const WIDGET_TEMPLATE_JSON = computed(() =>
  JSON.stringify(
    [
      {
        name: t('我的组件', 'My Widget'),
        size: '2x2',
        code: WIDGET_TEMPLATE_CODE,
      },
    ],
    null,
    2,
  ),
)

const RECOGNIZED_IMPORT_TEMPLATE_JSON = computed(() =>
  JSON.stringify(
    [
      {
        name: t('天气卡', 'Weather Card'),
        size: '2x2',
        code: "<div style='height:100%;display:flex;align-items:center;justify-content:center;border-radius:16px;background:rgba(255,255,255,.24);color:#fff;font:600 14px/1.4 -apple-system,BlinkMacSystemFont,\"Segoe UI\",sans-serif;'>Weather 26°C</div>",
      },
      {
        name: t('快捷卡', 'Quick Card'),
        size: '2x1',
        code: "<div style='height:100%;display:flex;align-items:center;justify-content:center;border-radius:14px;background:rgba(16,24,40,.42);color:#fff;font:600 13px/1.4 -apple-system,BlinkMacSystemFont,\"Segoe UI\",sans-serif;'>Quick Action</div>",
      },
    ],
    null,
    2,
  ),
)

const importJsonPlaceholder = computed(() =>
  t(
    '[{"name":"天气卡","size":"2x2","code":"<div>...</div>"}]',
    '[{"name":"Weather Card","size":"2x2","code":"<div>...</div>"}]',
  ),
)

const pageDisplayLabel = (pageIndex) => `${t('第', 'Screen ')}${pageIndex + 1}${t('屏', '')}`

const builtInWidgetLabel = (widgetId) => {
  if (widgetId === 'weather') return t('天气', 'Weather')
  if (widgetId === 'calendar') return t('日历', 'Calendar')
  if (widgetId === 'music') return t('音乐', 'Music')
  if (widgetId === 'system') return t('系统状态', 'System Status')
  if (widgetId === 'quick_heart') return t('快捷爱心', 'Quick Heart')
  if (widgetId === 'quick_disc') return t('快捷唱片', 'Quick Disc')
  return t('组件', 'Widget')
}

const widgetPageLabel = (widgetId) => {
  const pageIndex = homeWidgetPages.value.findIndex((page) => page.includes(widgetId))
  return pageIndex >= 0 ? pageDisplayLabel(pageIndex) : t('未放入主屏', 'Not on Home')
}

const builtInWidgetStates = computed(() =>
  BUILT_IN_WIDGET_OPTIONS.map((item) => {
    const pageIndex = homeWidgetPages.value.findIndex((page) => page.includes(item.id))
    return {
      ...item,
      label: builtInWidgetLabel(item.id),
      pageIndex,
      visible: pageIndex >= 0,
      pageLabel: pageIndex >= 0 ? pageDisplayLabel(pageIndex) : t('未放入主屏', 'Not on Home'),
    }
  }),
)

const openPanel = (panelId) => {
  activePanel.value = panelId
}

const triggerSaved = () => {
  systemStore.saveNow()
  saved.value = true
  if (savedTimerId) clearTimeout(savedTimerId)
  savedTimerId = setTimeout(() => {
    saved.value = false
  }, 1200)
}

const goHome = () => {
  pushReturnTarget(router, route, '/home')
}

const openHomeWidgetEdit = () => {
  router.push(
    buildRouteWithReturnSource('/home', 'home', {
      widgetEdit: '1',
      ...(returnHomePage.value ? { homePage: returnHomePage.value } : {}),
    }),
  )
}

const restoreBuiltInWidget = (tileId) => {
  const ok = systemStore.restoreBuiltInWidgetTile(tileId)
  if (!ok) {
    setImportFeedback('error', t('无法加入这个组件。', 'This widget cannot be added.'))
    return
  }
  setImportFeedback('success', t('组件已恢复到默认位置。', 'Widget restored to its default Home slot.'))
  triggerSaved()
}

const resetCustomWidgetForm = () => {
  editingWidgetId.value = ''
  customWidgetName.value = ''
  customWidgetSize.value = '2x2'
  customWidgetCode.value = ''
}

const startEditCustomWidget = (widget) => {
  activePanel.value = 'custom'
  editingWidgetId.value = widget.id
  customWidgetName.value = widget.name || ''
  customWidgetSize.value = widget.size || '2x2'
  customWidgetCode.value = widget.code || ''
}

const submitCustomWidget = () => {
  const code = customWidgetCode.value.trim()
  if (!code) {
    setImportFeedback('error', t('请先填写 Widget 内容。', 'Please enter widget content first.'))
    return
  }

  const payload = {
    name: customWidgetName.value.trim() || t('自定义组件', 'Custom Widget'),
    size: editingWidgetIsPlaced.value
      ? editingCustomWidget.value?.size || customWidgetSize.value
      : customWidgetSize.value,
    code,
  }

  if (editingWidgetId.value) {
    const ok = systemStore.updateCustomWidget(editingWidgetId.value, payload)
    if (!ok) {
      setImportFeedback('error', t('这个组件无法更新。', 'This widget cannot be updated.'))
      return
    }
    setImportFeedback('success', t('组件已更新。', 'Widget updated.'))
    triggerSaved()
    resetCustomWidgetForm()
    return
  }

  systemStore.addCustomWidget({
    ...payload,
    pageIndex: null,
    placeOnHome: false,
  })
  setImportFeedback('success', t('组件已加入库。', 'Widget added to the library.'))
  triggerSaved()
  resetCustomWidgetForm()
}

const removeCustomWidget = async (widgetId) => {
  const ok = await confirmDialog({
    title: t('删除自定义 Widget', 'Delete custom widget'),
    message: t('确认删除这个自定义 Widget 吗？', 'Delete this custom widget?'),
    confirmText: t('删除', 'Delete'),
    cancelText: t('取消', 'Cancel'),
    tone: 'danger',
  })
  if (!ok) return

  systemStore.removeCustomWidget(widgetId)
  if (editingWidgetId.value === widgetId) {
    resetCustomWidgetForm()
  }
  setImportFeedback('success', t('组件已删除。', 'Widget deleted.'))
  triggerSaved()
}

const copyWidgetTemplate = async () => {
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(WIDGET_TEMPLATE_JSON.value)
    } else {
      const temp = document.createElement('textarea')
      temp.value = WIDGET_TEMPLATE_JSON.value
      document.body.appendChild(temp)
      temp.select()
      document.execCommand('copy')
      document.body.removeChild(temp)
    }

    templateCopied.value = true
    if (copiedTimerId) clearTimeout(copiedTimerId)
    copiedTimerId = setTimeout(() => {
      templateCopied.value = false
    }, 1200)
  } catch {
    setImportFeedback('error', t('复制失败，请手动选择模板文本。', 'Copy failed. Please select the template text manually.'))
  }
}

const exportWidgetTemplate = () => {
  const content = `# SchatPhone Widget JSON Template\n\n${WIDGET_TEMPLATE_JSON.value}\n`
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = 'schatphone-widget-template.txt'
  anchor.click()
  URL.revokeObjectURL(url)
  setImportFeedback('success', t('模板文件下载已开始。', 'Template download has started.'))
}

const fillRecognizedImportTemplate = () => {
  clearImportFeedback()
  importJsonText.value = RECOGNIZED_IMPORT_TEMPLATE_JSON.value
}

const clearImportFeedback = () => {
  importFeedbackType.value = ''
  importFeedbackMessage.value = ''
  importFeedbackDetails.value = []
}

const setImportFeedback = (type, message, details = []) => {
  importFeedbackType.value = type
  importFeedbackMessage.value = message
  importFeedbackDetails.value = Array.isArray(details) ? details : []
}

const formatImportError = (error) => {
  const code = error?.code || 'UNKNOWN'
  const itemNumber = Number.isInteger(error?.index) && error.index >= 0 ? error.index + 1 : 0
  const itemPrefix = itemNumber > 0 ? `${t('第', 'Item ')}${itemNumber}${t('条', '')} ` : ''

  if (code === 'EMPTY_PAYLOAD') return t('导入内容为空。', 'Import content is empty.')
  if (code === 'INVALID_JSON') return t('JSON 格式错误。', 'Invalid JSON format.')
  if (code === 'TOP_LEVEL_NOT_ARRAY') return t('顶层必须是 JSON 数组。', 'Top-level must be a JSON array.')
  if (code === 'EMPTY_ARRAY') return t('数组不能为空。', 'Array cannot be empty.')
  if (code === 'PAYLOAD_TOO_LARGE') return t('导入内容过大。', 'Import content is too large.')
  if (code === 'BATCH_TOO_LARGE') return t('单次导入数量过多。', 'Too many widgets in one import.')
  if (code === 'ITEM_NOT_OBJECT') return `${itemPrefix}${t('格式不正确。', 'format is invalid.')}`
  if (code === 'NAME_TOO_LONG') return `${itemPrefix}${t('名称过长。', 'name is too long.')}`
  if (code === 'INVALID_SIZE') {
    return `${itemPrefix}${t(
      `尺寸仅支持 ${VALID_WIDGET_SIZES.join('/')}。`,
      `size must be ${VALID_WIDGET_SIZES.join('/')}.`,
    )}`
  }
  if (code === 'EMPTY_CODE') return `${itemPrefix}${t('缺少 Widget 内容。', 'widget content is missing.')}`
  if (code === 'CODE_TOO_LONG') return `${itemPrefix}${t('Widget 内容过长。', 'widget content is too long.')}`
  if (code === 'DANGEROUS_CODE') {
    return `${itemPrefix}${t('包含不支持的脚本内容。', 'contains unsupported script content.')}`
  }
  if (code === 'ROLLBACK_FAILED') return t('导入失败，原有组件未改动。', 'Import failed and existing widgets were not changed.')
  return t('导入失败。', 'Import failed.')
}

const formatImportWarning = (warning) => {
  const code = warning?.code || 'UNKNOWN'
  const itemNumber = Number.isInteger(warning?.index) && warning.index >= 0 ? warning.index + 1 : 0
  const itemPrefix = itemNumber > 0 ? `${t('第', 'Item ')}${itemNumber}${t('条', '')} ` : ''
  if (code === 'IGNORED_FIELDS') return `${itemPrefix}${t('已忽略未使用字段。', 'unsupported fields were ignored.')}`
  return `${itemPrefix}${t('有提醒需要留意。', 'has a warning.')}`
}

const importCustomWidgets = () => {
  const raw = importJsonText.value.trim()
  clearImportFeedback()
  if (!raw) {
    setImportFeedback('error', t('请先粘贴导入内容。', 'Please paste import content first.'))
    return
  }

  const result = systemStore.importCustomWidgets(raw, null, { placeOnHome: false })
  if (!result?.ok) {
    const details = (result?.errors || []).map((item) => formatImportError(item))
    setImportFeedback('error', details[0] || t('导入失败。', 'Import failed.'), details)
    return
  }

  const warningCount = Array.isArray(result.warnings) ? result.warnings.length : 0
  const details = (result.warnings || []).map((item) => formatImportWarning(item))
  const message =
    warningCount > 0
      ? t(
          `已导入 ${result.importedCount} 个组件，含 ${warningCount} 条提醒。`,
          `Imported ${result.importedCount} widgets with ${warningCount} warnings.`,
        )
      : t(
          `已导入 ${result.importedCount} 个组件。`,
          `Imported ${result.importedCount} widgets.`,
        )
  setImportFeedback(warningCount > 0 ? 'warning' : 'success', message, details)
  importJsonText.value = ''
  triggerSaved()
}

onBeforeUnmount(() => {
  if (savedTimerId) clearTimeout(savedTimerId)
  if (copiedTimerId) clearTimeout(copiedTimerId)
})
</script>

<template>
  <div class="widgets-shell">
    <header class="widgets-header">
      <button class="widgets-icon-btn" type="button" @click="goHome" :aria-label="returnButtonLabel">
        <i class="fas fa-chevron-left"></i>
      </button>
      <div class="widgets-heading">
        <span>{{ t('主屏组件', 'Home Widgets') }}</span>
        <h1>{{ t('Widget 中心', 'Widget Center') }}</h1>
      </div>
      <button class="widgets-home-btn" type="button" @click="goHome">
        <i :class="returnLabelKey === 'Settings' ? 'fas fa-gear' : 'fas fa-house'"></i>
        <span>{{ returnButtonLabel }}</span>
      </button>
    </header>

    <nav class="widgets-tabs" :aria-label="t('Widget 中心分区', 'Widget center sections')">
      <button
        v-for="panel in panels"
        :key="panel.id"
        class="widgets-tab"
        :class="{ 'is-active': activePanel === panel.id }"
        type="button"
        @click="openPanel(panel.id)"
      >
        <i :class="panel.icon"></i>
        <span>{{ panel.label }}</span>
      </button>
    </nav>

    <main class="widgets-content no-scrollbar">
      <section v-if="activePanel === 'library'" class="widgets-section">
        <div class="widgets-section-head">
          <div>
            <h2>{{ t('内置组件', 'Built-in widgets') }}</h2>
            <p>{{ t('这里只恢复默认组件；更换主屏位置请进入组件编辑。', 'Restore default widgets here; change Home slots in widget edit mode.') }}</p>
          </div>
          <button class="widgets-secondary-btn" type="button" @click="openHomeWidgetEdit">
            <i class="fas fa-table-cells"></i>
            <span>{{ t('编辑主屏组件', 'Edit Home Widgets') }}</span>
          </button>
        </div>

        <div class="widgets-library-list">
          <article v-for="widget in builtInWidgetStates" :key="widget.id" class="widgets-library-item">
            <span class="widgets-item-icon">
              <i :class="widget.icon"></i>
            </span>
            <div class="widgets-item-body">
              <h3>{{ widget.label }}</h3>
              <p>{{ widget.size }} · {{ widget.pageLabel }}</p>
            </div>
            <button class="widgets-action-btn" type="button" @click="restoreBuiltInWidget(widget.id)">
              {{ widget.visible ? t('恢复默认', 'Restore') : t('恢复到主屏', 'Restore') }}
            </button>
          </article>
        </div>
      </section>

      <section v-else-if="activePanel === 'custom'" class="widgets-section">
        <div class="widgets-section-head">
          <div>
            <h2>{{ t('自定义组件', 'Custom widgets') }}</h2>
            <p>{{ t('创建或调整自己的主屏组件。', 'Create or adjust your own Home widgets.') }}</p>
          </div>
          <div class="widgets-head-actions">
            <button class="widgets-secondary-btn" type="button" @click="copyWidgetTemplate">
              <i class="fas fa-copy"></i>
              <span>{{ templateCopied ? t('已复制', 'Copied') : t('复制模板', 'Copy template') }}</span>
            </button>
            <button class="widgets-secondary-btn" type="button" @click="exportWidgetTemplate">
              <i class="fas fa-file-arrow-down"></i>
              <span>{{ t('导出 TXT', 'Export TXT') }}</span>
            </button>
          </div>
        </div>

        <div class="widgets-form">
          <label class="widgets-field">
            <span>{{ t('名称', 'Name') }}</span>
            <input
              v-model="customWidgetName"
              type="text"
              :placeholder="t('例如：时间胶囊', 'Example: Time Capsule')"
            />
          </label>

          <div class="widgets-form-grid">
            <label class="widgets-field">
              <span>{{ t('尺寸', 'Size') }}</span>
              <select v-model="customWidgetSize" :disabled="editingWidgetIsPlaced">
                <option v-for="size in CUSTOM_SIZE_OPTIONS" :key="size" :value="size">{{ size }}</option>
              </select>
              <small v-if="editingWidgetIsPlaced" class="widgets-field-hint">
                {{ t('已放置的组件保留当前尺寸。', 'Placed widgets keep their current size.') }}
              </small>
            </label>
          </div>

          <label class="widgets-field">
            <span>{{ t('Widget 内容', 'Widget content') }}</span>
            <textarea
              v-model="customWidgetCode"
              spellcheck="false"
              placeholder="<div style='height:100%;display:flex;align-items:center;justify-content:center;'>Hello Widget</div>"
            ></textarea>
          </label>

          <div class="widgets-form-actions">
            <button class="widgets-primary-btn" type="button" @click="submitCustomWidget">
              {{ editingWidgetId ? t('更新 Widget', 'Update Widget') : t('添加 Widget', 'Add Widget') }}
            </button>
            <button v-if="editingWidgetId" class="widgets-secondary-btn" type="button" @click="resetCustomWidgetForm">
              {{ t('取消编辑', 'Cancel Edit') }}
            </button>
          </div>
        </div>

        <div class="widgets-created">
          <div class="widgets-section-subhead">
            <h3>{{ t('已创建', 'Created') }}</h3>
            <span>{{ customWidgets.length }}</span>
          </div>

          <div v-if="!hasCustomWidgets" class="widgets-empty">
            {{ t('还没有自定义组件。', 'No custom widgets yet.') }}
          </div>

          <article v-for="widget in customWidgets" :key="widget.id" class="widgets-created-item">
            <div>
              <h4>{{ widget.name }}</h4>
              <p>{{ widget.size }} · {{ widgetPageLabel(widget.id) }}</p>
            </div>
            <div class="widgets-created-actions">
              <button type="button" @click="startEditCustomWidget(widget)">{{ t('编辑', 'Edit') }}</button>
              <button type="button" class="is-danger" @click="removeCustomWidget(widget.id)">{{ t('删除', 'Delete') }}</button>
            </div>
          </article>
        </div>
      </section>

      <section v-else class="widgets-section">
        <div class="widgets-section-head">
          <div>
            <h2>{{ t('导入组件', 'Import widgets') }}</h2>
            <p>{{ t('导入后进入组件库；回到主屏编辑槽位时再选择使用。', 'Imported widgets go into the library; choose them from Home widget edit mode.') }}</p>
          </div>
          <button class="widgets-secondary-btn" type="button" @click="fillRecognizedImportTemplate">
            <i class="fas fa-wand-magic-sparkles"></i>
            <span>{{ t('填入模板', 'Use template') }}</span>
          </button>
        </div>

        <label class="widgets-field">
          <span>{{ t('导入内容', 'Import content') }}</span>
          <textarea
            v-model="importJsonText"
            class="widgets-import-textarea"
            spellcheck="false"
            :placeholder="importJsonPlaceholder"
          ></textarea>
        </label>

        <div class="widgets-import-actions">
          <button class="widgets-primary-btn" type="button" @click="importCustomWidgets">
            {{ t('导入', 'Import') }}
          </button>
        </div>

        <div class="widgets-import-note">
          <p>{{ t('支持 name、size、code 三项；尺寸支持 1x1、2x1、2x2、4x2、4x3。', 'Supports name, size, and code; sizes: 1x1, 2x1, 2x2, 4x2, 4x3.') }}</p>
        </div>
      </section>
    </main>

    <div
      v-if="importFeedbackMessage"
      class="widgets-feedback"
      :class="`is-${importFeedbackType || 'success'}`"
      aria-live="polite"
    >
      <p>{{ importFeedbackMessage }}</p>
      <span v-for="(detail, idx) in importFeedbackDetails" :key="`widget-feedback-${idx}`">{{ detail }}</span>
    </div>

    <div v-if="saved" class="widgets-saved-toast" aria-live="polite">
      <i class="fas fa-check-circle"></i>
      <span>{{ t('已保存', 'Saved') }}</span>
    </div>
  </div>
</template>

<style scoped>
.widgets-shell {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--system-page-bg);
  color: var(--system-text);
}

.widgets-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: calc(42px + env(safe-area-inset-top)) 16px 12px;
  border-bottom: 1px solid var(--system-border);
  background: var(--system-chrome-bg);
  box-shadow: var(--system-shadow-chrome);
  backdrop-filter: blur(var(--system-blur-md)) saturate(1.1);
  -webkit-backdrop-filter: blur(var(--system-blur-md)) saturate(1.1);
}

.widgets-heading {
  min-width: 0;
  flex: 1;
}

.widgets-heading span {
  display: block;
  color: var(--system-text-muted);
  font-size: 11px;
  font-weight: 600;
  line-height: 1.2;
}

.widgets-heading h1 {
  margin: 2px 0 0;
  font-size: 24px;
  font-weight: 700;
  line-height: 1.1;
  letter-spacing: 0;
}

.widgets-icon-btn,
.widgets-home-btn,
.widgets-tab,
.widgets-action-btn,
.widgets-primary-btn,
.widgets-secondary-btn,
.widgets-created-actions button {
  border: 0;
  cursor: pointer;
  font: inherit;
  -webkit-tap-highlight-color: transparent;
}

.widgets-icon-btn {
  width: 38px;
  height: 38px;
  border-radius: 14px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--system-text);
  background: var(--system-surface-strong);
  box-shadow: var(--system-shadow-control);
}

.widgets-home-btn {
  min-height: 38px;
  border-radius: 14px;
  padding: 0 11px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--system-text);
  background: var(--system-surface-strong);
  box-shadow: var(--system-shadow-control);
  font-size: 12px;
  font-weight: 700;
}

.widgets-tabs {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 6px;
  padding: 10px 16px;
  background: var(--system-surface-muted);
}

.widgets-tab {
  min-height: 42px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  color: var(--system-text-muted);
  background: var(--system-control-bg);
  border: 1px solid var(--system-subtle-border);
  font-size: 12px;
  font-weight: 700;
  transition: transform var(--system-motion-fast), background var(--system-motion-fast), color var(--system-motion-fast);
}

.widgets-tab.is-active {
  color: var(--system-text);
  background: var(--system-surface-strong);
  box-shadow: var(--system-shadow-control);
}

.widgets-tab:active,
.widgets-icon-btn:active,
.widgets-home-btn:active,
.widgets-action-btn:active,
.widgets-primary-btn:active,
.widgets-secondary-btn:active {
  transform: scale(0.97);
}

.widgets-content {
  flex: 1;
  overflow-y: auto;
  padding: 8px 16px 104px;
}

.widgets-section {
  border: 1px solid var(--system-border);
  border-radius: 26px;
  background: var(--system-panel-bg);
  box-shadow: var(--system-shadow-card);
  padding: 15px;
}

.widgets-section-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}

.widgets-head-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  flex-wrap: wrap;
}

.widgets-section-head h2,
.widgets-section-subhead h3,
.widgets-library-item h3,
.widgets-created-item h4 {
  margin: 0;
  letter-spacing: 0;
}

.widgets-section-head h2 {
  font-size: 18px;
  font-weight: 700;
}

.widgets-section-head p {
  margin: 4px 0 0;
  color: var(--system-text-muted);
  font-size: 12px;
  line-height: 1.45;
}

.widgets-select-field,
.widgets-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  color: var(--system-text-muted);
  font-size: 11px;
  font-weight: 700;
}

.widgets-select-field select,
.widgets-field input,
.widgets-field select,
.widgets-field textarea {
  width: 100%;
  border: 1px solid var(--system-control-border);
  border-radius: 14px;
  background: var(--system-control-bg);
  color: var(--system-text);
  outline: none;
  box-shadow: inset 0 1px 0 var(--system-edge-highlight);
}

.widgets-select-field select {
  min-width: 116px;
  min-height: 38px;
  padding: 0 10px;
  font-size: 12px;
}

.widgets-field input,
.widgets-field select {
  min-height: 44px;
  padding: 0 12px;
  font-size: 14px;
}

.widgets-field textarea {
  min-height: 136px;
  padding: 11px;
  resize: vertical;
  font-family: ui-monospace, SFMono-Regular, Consolas, "Liberation Mono", monospace;
  font-size: 12px;
  line-height: 1.5;
}

.widgets-field select:disabled {
  opacity: 0.72;
  cursor: not-allowed;
}

.widgets-field-hint {
  color: var(--system-text-muted);
  font-size: 11px;
  font-weight: 600;
  line-height: 1.35;
}

.widgets-import-textarea {
  min-height: 220px;
}

.widgets-library-list,
.widgets-form,
.widgets-created {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.widgets-library-item,
.widgets-created-item {
  border: 1px solid var(--system-subtle-border);
  border-radius: 20px;
  background: var(--system-control-bg);
  padding: 11px;
}

.widgets-library-item {
  display: flex;
  align-items: center;
  gap: 10px;
}

.widgets-item-icon {
  width: 44px;
  height: 44px;
  border-radius: 16px;
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #f7fafc;
  background: linear-gradient(135deg, #5d8295, #385e75);
  box-shadow: 0 8px 18px rgba(16, 24, 40, 0.14);
}

.widgets-item-body {
  min-width: 0;
  flex: 1;
}

.widgets-item-body h3 {
  font-size: 14px;
  font-weight: 700;
}

.widgets-item-body p,
.widgets-created-item p {
  margin: 3px 0 0;
  color: var(--system-text-muted);
  font-size: 11px;
  line-height: 1.35;
}

.widgets-action-btn,
.widgets-primary-btn,
.widgets-secondary-btn {
  min-height: 40px;
  border-radius: 14px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: 0 12px;
  font-size: 12px;
  font-weight: 700;
  transition: transform var(--system-motion-fast), filter var(--system-motion-fast);
}

.widgets-action-btn,
.widgets-primary-btn {
  color: var(--system-text-inverse);
  background: var(--system-accent);
  box-shadow: 0 10px 18px rgba(68, 111, 135, 0.18);
}

.widgets-secondary-btn {
  color: var(--system-text);
  background: var(--system-control-bg);
  border: 1px solid var(--system-control-border);
}

.widgets-form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.widgets-form-actions,
.widgets-import-actions {
  display: flex;
  align-items: end;
  gap: 10px;
}

.widgets-import-actions .widgets-primary-btn {
  flex: 1;
}

.widgets-form-actions .widgets-primary-btn {
  flex: 1;
}

.widgets-section-subhead {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 4px 0 0;
}

.widgets-section-subhead h3 {
  font-size: 14px;
  font-weight: 700;
}

.widgets-section-subhead span {
  color: var(--system-text-muted);
  font-size: 12px;
  font-weight: 700;
}

.widgets-empty {
  border-radius: 18px;
  background: var(--system-surface-muted);
  color: var(--system-text-muted);
  padding: 18px;
  text-align: center;
  font-size: 13px;
}

.widgets-created-item {
  display: grid;
  gap: 10px;
}

.widgets-created-item h4 {
  font-size: 14px;
  font-weight: 700;
}

.widgets-created-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
}

.widgets-created-actions button {
  min-height: 34px;
  border-radius: 999px;
  padding: 0 11px;
  color: var(--system-text);
  background: var(--system-control-bg);
  border: 1px solid var(--system-control-border);
  font-size: 11px;
  font-weight: 700;
}

.widgets-created-actions button.is-danger {
  color: var(--system-danger);
  border-color: rgba(184, 83, 83, 0.22);
}

.widgets-import-note {
  margin-top: 12px;
  border-radius: 18px;
  background: var(--system-surface-muted);
  padding: 12px;
  color: var(--system-text-muted);
  font-size: 12px;
  line-height: 1.45;
}

.widgets-import-note p {
  margin: 0;
}

.widgets-feedback,
.widgets-saved-toast {
  position: absolute;
  left: 16px;
  right: 16px;
  z-index: 40;
  border-radius: 18px;
  border: 1px solid var(--system-card-border);
  background: var(--system-elevated-bg);
  box-shadow: var(--system-shadow-soft);
  backdrop-filter: blur(var(--system-blur-md)) saturate(1.1);
  -webkit-backdrop-filter: blur(var(--system-blur-md)) saturate(1.1);
}

.widgets-feedback {
  bottom: calc(20px + env(safe-area-inset-bottom));
  padding: 11px 13px;
  color: var(--system-text);
}

.widgets-feedback.is-error {
  color: var(--system-danger);
}

.widgets-feedback.is-warning {
  color: var(--system-warning);
}

.widgets-feedback.is-success {
  color: var(--system-success);
}

.widgets-feedback p {
  margin: 0;
  font-size: 12px;
  font-weight: 700;
}

.widgets-feedback span {
  display: block;
  margin-top: 4px;
  font-size: 11px;
  line-height: 1.35;
}

.widgets-saved-toast {
  top: calc(88px + env(safe-area-inset-top));
  left: 50%;
  right: auto;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  width: auto;
  padding: 8px 12px;
  transform: translateX(-50%);
  color: var(--system-success);
  font-size: 12px;
  font-weight: 700;
}

@media (max-width: 380px) {
  .widgets-section-head,
  .widgets-head-actions,
  .widgets-library-item,
  .widgets-form-actions,
  .widgets-import-actions {
    align-items: stretch;
    flex-direction: column;
  }

  .widgets-select-field select {
    min-width: 0;
  }

  .widgets-action-btn {
    width: 100%;
  }
}
</style>
