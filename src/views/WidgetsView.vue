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
import { OFFICIAL_WIDGET_STYLE_PRESETS } from '../lib/widget-style-presets'
import { BUILT_IN_HOME_WIDGETS } from '../lib/home-widgets'
import {
  CUSTOM_WIDGET_ACTION_APP_TARGETS,
  CUSTOM_WIDGET_ACTION_SYSTEM_TARGETS,
  CUSTOM_WIDGET_ACTION_TYPE_NONE,
  CUSTOM_WIDGET_ACTION_TYPE_OPEN_APP,
  CUSTOM_WIDGET_ACTION_TYPE_OPEN_SYSTEM,
  normalizeCustomWidgetAction,
} from '../lib/custom-widget-actions'

const WIDGET_SIZE_FILTER_ALL = 'all'
const CUSTOM_SIZE_OPTIONS = [...VALID_WIDGET_SIZES]
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
const widgetSizeFilter = ref(WIDGET_SIZE_FILTER_ALL)
const previewedStylePresetId = ref('')
const customWidgetName = ref('')
const customWidgetSize = ref('2x2')
const customWidgetCode = ref('')
const customWidgetActionType = ref(CUSTOM_WIDGET_ACTION_TYPE_NONE)
const customWidgetActionTarget = ref('')
const editingWidgetId = ref('')
const customWidgetCodeTextarea = ref(null)
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
const widgetSizeFilterOptions = computed(() => [
  { id: WIDGET_SIZE_FILTER_ALL, label: t('全部', 'All') },
  ...VALID_WIDGET_SIZES.map((size) => ({ id: size, label: size })),
])

const CODE_SNIPPET_OPTIONS = Object.freeze([
  {
    id: 'title',
    icon: 'fas fa-heading',
    labelZh: '标题',
    labelEn: 'Title',
    snippet: '{{text:title}}',
  },
  {
    id: 'subtitle',
    icon: 'fas fa-align-left',
    labelZh: '副标题',
    labelEn: 'Subtitle',
    snippet: '{{text:subtitle}}',
  },
  {
    id: 'caption',
    icon: 'fas fa-quote-left',
    labelZh: '短句',
    labelEn: 'Caption',
    snippet: '{{text:caption}}',
  },
  {
    id: 'image',
    icon: 'fas fa-image',
    labelZh: '图片位',
    labelEn: 'Image slot',
    snippet: '<div data-cw-image="photo"></div>',
  },
])

const customWidgets = computed(() => settings.value.appearance.customWidgets || [])
const homeWidgetPages = computed(() => settings.value.appearance.homeWidgetPages || [])
const hasCustomWidgets = computed(() => customWidgets.value.length > 0)
const widgetPreviewDate = computed(() => new Date())
const widgetPreviewWeekday = computed(() =>
  widgetPreviewDate.value.toLocaleString(undefined, { weekday: 'short' }),
)
const customWidgetActionTypes = computed(() => [
  { id: CUSTOM_WIDGET_ACTION_TYPE_NONE, label: t('无动作', 'No action') },
  { id: CUSTOM_WIDGET_ACTION_TYPE_OPEN_APP, label: t('打开 APP', 'Open app') },
  { id: CUSTOM_WIDGET_ACTION_TYPE_OPEN_SYSTEM, label: t('打开系统入口', 'Open system entry') },
])
const customWidgetAppActionTargets = computed(() =>
  CUSTOM_WIDGET_ACTION_APP_TARGETS.map((target) => ({
    id: target.id,
    label: t(target.labelZh, target.labelEn),
  })),
)
const customWidgetSystemActionTargets = computed(() =>
  CUSTOM_WIDGET_ACTION_SYSTEM_TARGETS.map((target) => ({
    id: target.id,
    label: t(target.labelZh, target.labelEn),
  })),
)
const currentCustomWidgetActionTargets = computed(() => {
  if (customWidgetActionType.value === CUSTOM_WIDGET_ACTION_TYPE_OPEN_APP) {
    return customWidgetAppActionTargets.value
  }
  if (customWidgetActionType.value === CUSTOM_WIDGET_ACTION_TYPE_OPEN_SYSTEM) {
    return customWidgetSystemActionTargets.value
  }
  return []
})
const editingCustomWidget = computed(() =>
  customWidgets.value.find((widget) => widget.id === editingWidgetId.value) || null,
)
const editingWidgetIsPlaced = computed(() =>
  Boolean(
    editingWidgetId.value &&
      homeWidgetPages.value.some((page) => Array.isArray(page) && page.includes(editingWidgetId.value)),
  ),
)
const customWidgetDraftSize = computed(() =>
  editingWidgetIsPlaced.value
    ? editingCustomWidget.value?.size || customWidgetSize.value
    : customWidgetSize.value,
)
const customWidgetDraftPreview = computed(() => ({
  size: customWidgetDraftSize.value,
  code: customWidgetCode.value.trim(),
}))
const hasCustomWidgetDraftPreview = computed(() => customWidgetDraftPreview.value.code.length > 0)
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

const builtInWidgetStates = computed(() =>
  BUILT_IN_HOME_WIDGETS.map((item) => {
    const pageIndex = homeWidgetPages.value.findIndex((page) => page.includes(item.id))
    return {
      ...item,
      label: t(item.nameZh, item.nameEn),
      visible: pageIndex >= 0,
    }
  }),
)
const officialStylePresetStates = computed(() =>
  OFFICIAL_WIDGET_STYLE_PRESETS.map((preset) => ({
    ...preset,
    label: t(preset.nameZh, preset.nameEn),
    added: customWidgets.value.some((widget) => widget.name === t(preset.nameZh, preset.nameEn)),
  })),
)
const filteredBuiltInWidgetStates = computed(() =>
  builtInWidgetStates.value.filter(
    (widget) => widgetSizeFilter.value === WIDGET_SIZE_FILTER_ALL || widget.size === widgetSizeFilter.value,
  ),
)
const filteredOfficialStylePresetStates = computed(() =>
  officialStylePresetStates.value.filter(
    (preset) => widgetSizeFilter.value === WIDGET_SIZE_FILTER_ALL || preset.size === widgetSizeFilter.value,
  ),
)
const visibleMarketItemCount = computed(
  () => filteredBuiltInWidgetStates.value.length + filteredOfficialStylePresetStates.value.length,
)
const previewedStylePreset = computed(
  () => officialStylePresetStates.value.find((preset) => preset.id === previewedStylePresetId.value) || null,
)

const customWidgetPreviewSrcDoc = (widget = {}) => {
  const body = typeof widget.code === 'string' ? widget.code : ''
  return `<!doctype html>
<html>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <style>
      html, body { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; background: transparent; }
      body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
      #widget-root { width: 100%; height: 100%; }
    </style>
  </head>
  <body>
    <div id="widget-root">${body}</div>
  </body>
</html>`
}

const ensureCustomWidgetActionTarget = () => {
  const targets = currentCustomWidgetActionTargets.value
  if (customWidgetActionType.value === CUSTOM_WIDGET_ACTION_TYPE_NONE) {
    customWidgetActionTarget.value = ''
    return
  }
  if (!targets.some((target) => target.id === customWidgetActionTarget.value)) {
    customWidgetActionTarget.value = targets[0]?.id || ''
  }
}

const normalizeCustomWidgetFormAction = () => {
  ensureCustomWidgetActionTarget()
  return normalizeCustomWidgetAction({
    type: customWidgetActionType.value,
    target: customWidgetActionTarget.value,
  })
}

const customWidgetActionLabel = (actionInput) => {
  const action = normalizeCustomWidgetAction(actionInput)
  if (action.type === CUSTOM_WIDGET_ACTION_TYPE_OPEN_APP) {
    const target = customWidgetAppActionTargets.value.find((item) => item.id === action.target)
    return target ? t('打开 ', 'Opens ') + target.label : t('打开 APP', 'Opens app')
  }
  if (action.type === CUSTOM_WIDGET_ACTION_TYPE_OPEN_SYSTEM) {
    const target = customWidgetSystemActionTargets.value.find((item) => item.id === action.target)
    return target ? t('打开 ', 'Opens ') + target.label : t('打开系统入口', 'Opens system entry')
  }
  return t('无点击动作', 'No click action')
}

const closeStylePresetPreview = () => {
  previewedStylePresetId.value = ''
}

const openPanel = (panelId) => {
  activePanel.value = panelId
  closeStylePresetPreview()
  clearImportFeedback()
}

const setWidgetSizeFilter = (size) => {
  widgetSizeFilter.value = widgetSizeFilterOptions.value.some((option) => option.id === size)
    ? size
    : WIDGET_SIZE_FILTER_ALL
}

const openStylePresetPreview = (preset) => {
  if (!preset?.id) return
  previewedStylePresetId.value = preset.id
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

const openAppearance = () => {
  const source = returnLabelKey.value === 'Settings' ? 'settings' : 'home'
  router.push(
    buildRouteWithReturnSource('/appearance', source, {
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

const addOfficialStylePreset = (preset) => {
  if (!preset?.code) return
  systemStore.addCustomWidget({
    name: t(preset.nameZh, preset.nameEn),
    size: preset.size,
    code: preset.code,
    pageIndex: null,
    placeOnHome: false,
  })
  setImportFeedback('success', t('样式已加入自定义组件库。', 'Style added to the custom widget library.'))
  triggerSaved()
}

const addPreviewedStylePreset = () => {
  if (!previewedStylePreset.value) return
  addOfficialStylePreset(previewedStylePreset.value)
}

const hasCustomWidgetDraftChanges = () =>
  Boolean(
    editingWidgetId.value ||
      customWidgetName.value.trim() ||
      customWidgetCode.value.trim() ||
      customWidgetActionType.value !== CUSTOM_WIDGET_ACTION_TYPE_NONE ||
      customWidgetActionTarget.value,
  )

const applyStylePresetToCustomForm = async (preset) => {
  if (!preset?.code) return false
  if (hasCustomWidgetDraftChanges()) {
    const ok = await confirmDialog({
      title: t('套用样式模板', 'Use style template'),
      message: t('当前编辑内容会被模板替换。', 'The current draft will be replaced by this template.'),
      confirmText: t('套用', 'Use'),
      cancelText: t('取消', 'Cancel'),
    })
    if (!ok) return false
  }

  activePanel.value = 'custom'
  editingWidgetId.value = ''
  customWidgetName.value = t(preset.nameZh, preset.nameEn)
  customWidgetSize.value = preset.size
  customWidgetCode.value = preset.code
  customWidgetActionType.value = CUSTOM_WIDGET_ACTION_TYPE_NONE
  customWidgetActionTarget.value = ''
  clearImportFeedback()
  setImportFeedback('success', t('模板已填入编辑器。', 'Template loaded into the editor.'))
  return true
}

const applyPreviewedStylePresetToCustomForm = async () => {
  if (!previewedStylePreset.value) return
  const applied = await applyStylePresetToCustomForm(previewedStylePreset.value)
  if (applied) closeStylePresetPreview()
}

const insertCodeSnippet = (snippet) => {
  if (!snippet) return
  const textarea = customWidgetCodeTextarea.value
  const currentCode = customWidgetCode.value
  const start = Number.isInteger(textarea?.selectionStart) ? textarea.selectionStart : currentCode.length
  const end = Number.isInteger(textarea?.selectionEnd) ? textarea.selectionEnd : start
  const prefix = currentCode.slice(0, start)
  const suffix = currentCode.slice(end)
  const leadingSpace = prefix && !/\s$/.test(prefix) ? ' ' : ''
  const trailingSpace = suffix && !/^\s/.test(suffix) ? ' ' : ''
  const inserted = `${leadingSpace}${snippet}${trailingSpace}`
  customWidgetCode.value = `${prefix}${inserted}${suffix}`

  requestAnimationFrame(() => {
    textarea?.focus()
    const nextPosition = start + inserted.length - trailingSpace.length
    textarea?.setSelectionRange(nextPosition, nextPosition)
  })
}

const resetCustomWidgetForm = () => {
  editingWidgetId.value = ''
  customWidgetName.value = ''
  customWidgetSize.value = '2x2'
  customWidgetCode.value = ''
  customWidgetActionType.value = CUSTOM_WIDGET_ACTION_TYPE_NONE
  customWidgetActionTarget.value = ''
}

const startEditCustomWidget = (widget) => {
  const action = normalizeCustomWidgetAction(widget.action)
  activePanel.value = 'custom'
  editingWidgetId.value = widget.id
  customWidgetName.value = widget.name || ''
  customWidgetSize.value = widget.size || '2x2'
  customWidgetCode.value = widget.code || ''
  customWidgetActionType.value = action.type
  customWidgetActionTarget.value = action.target
  ensureCustomWidgetActionTarget()
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
    action: normalizeCustomWidgetFormAction(),
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
        <div class="widgets-title-row">
          <h1>{{ t('Widget 中心', 'Widget Center') }}</h1>
          <span v-if="saved" class="widgets-saved-inline" aria-live="polite">
            <i class="fas fa-check-circle"></i>
            <span>{{ t('已保存', 'Saved') }}</span>
          </span>
        </div>
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
      <section class="widgets-bridge-panel">
        <button class="widgets-bridge-action is-primary" type="button" @click="openHomeWidgetEdit">
          <span class="widgets-bridge-icon">
            <i class="fas fa-mobile-screen"></i>
          </span>
          <span>
            <strong>{{ t('编辑主屏', 'Edit Home') }}</strong>
            <small>{{ t('桌面槽位', 'Home slots') }}</small>
          </span>
        </button>
        <button class="widgets-bridge-action" type="button" @click="openAppearance">
          <span class="widgets-bridge-icon">
            <i class="fas fa-palette"></i>
          </span>
          <span>
            <strong>{{ t('外观', 'Appearance') }}</strong>
            <small>{{ t('主题与布局', 'Themes and layout') }}</small>
          </span>
        </button>
      </section>

      <section v-if="activePanel === 'library'" class="widgets-section">
        <div class="widgets-section-head">
          <div>
            <h2>{{ t('组件市场', 'Widget Market') }}</h2>
            <p>{{ t('先看外观，再回到主屏模板槽位里选择使用。', 'Preview the look here, then choose it inside Home template slots.') }}</p>
          </div>
          <button class="widgets-secondary-btn" type="button" @click="openHomeWidgetEdit">
            <i class="fas fa-table-cells"></i>
            <span>{{ t('编辑模板', 'Edit Layout') }}</span>
          </button>
        </div>

        <div class="widgets-market-tools">
          <div class="widgets-size-filter" :aria-label="t('按尺寸筛选组件', 'Filter widgets by size')" role="group">
            <button
              v-for="option in widgetSizeFilterOptions"
              :key="option.id"
              type="button"
              :class="{ 'is-active': widgetSizeFilter === option.id }"
              @click="setWidgetSizeFilter(option.id)"
            >
              {{ option.label }}
            </button>
          </div>
          <span>{{ t(`共 ${visibleMarketItemCount} 个`, `${visibleMarketItemCount} items`) }}</span>
        </div>

        <div class="widgets-market-grid">
          <article
            v-for="preset in filteredOfficialStylePresetStates"
            :key="`preset-${preset.id}`"
            class="widgets-market-card is-style-preset"
            :class="[`is-${preset.preview}`, `size-${preset.size.replace('x', '-')}`]"
          >
            <button
              class="widgets-preview-stage widgets-preview-open"
              :class="`preview-${preset.preview}`"
              type="button"
              :aria-label="t('查看组件预览', 'Preview widget') + ` ${preset.label}`"
              @click="openStylePresetPreview(preset)"
            >
              <div v-if="preset.preview === 'charm'" class="widget-preview style-preview charm-preview">
                <span><strong>82</strong><small>mood</small></span>
              </div>
              <div v-else-if="preset.preview === 'capsule'" class="widget-preview style-preview capsule-preview">
                <span></span><div><small>dream index</small><strong>91%</strong></div><b>+</b>
              </div>
              <div v-else-if="preset.preview === 'diary'" class="widget-preview style-preview diary-preview">
                <h4>icity</h4><p>cloudy walk, soft notes</p><span><i></i><small>May 25</small></span>
              </div>
              <div v-else-if="preset.preview === 'day'" class="widget-preview style-preview day-preview">
                <span><strong>25</strong><small>MON</small></span><div><h4>Today</h4><p>coffee note</p><p>theme draft</p></div>
              </div>
              <div v-else-if="preset.preview === 'board'" class="widget-preview style-preview board-preview">
                <div class="board-stage"><span></span><i></i><b></b></div><div><strong>Theme Board</strong><small>photos, colors, notes</small></div>
              </div>
              <div v-else-if="preset.preview === 'island_v2'" class="widget-preview style-preview island-preview">
                <i></i><span><strong>Night Drive</strong><small>soft radio</small></span><b>ON</b>
              </div>
              <div v-else-if="preset.preview === 'polaroid'" class="widget-preview style-preview polaroid-preview">
                <span></span><span></span><strong>mood</strong>
              </div>
              <div v-else-if="preset.preview === 'orb'" class="widget-preview style-preview orb-preview">
                <span>♡</span>
              </div>
              <div v-else-if="preset.preview === 'island'" class="widget-preview style-preview island-preview">
                <i>♪</i><span><strong>Night Drive</strong><small>soft radio</small></span><b>••</b>
              </div>
              <div v-else-if="preset.preview === 'pass'" class="widget-preview style-preview pass-preview">
                <span></span><strong>ACCESS</strong><small>card</small>
              </div>
              <div v-else-if="preset.preview === 'live'" class="widget-preview style-preview live-preview">
                <span>♡</span><div><strong>Live Room</strong><small>pink set</small></div>
              </div>
              <div v-else class="widget-preview style-preview magazine-preview">
                <strong>VIBE</strong><span></span><small>cover story</small>
              </div>
            </button>
            <div class="widgets-market-info">
              <div>
                <h3>{{ preset.label }}</h3>
                <span>{{ preset.size }}</span>
              </div>
              <button class="widgets-action-btn" type="button" @click.stop="addOfficialStylePreset(preset)">
                {{ preset.added ? t('再添加', 'Add again') : t('加入库', 'Add') }}
              </button>
            </div>
          </article>
          <article
            v-for="widget in filteredBuiltInWidgetStates"
            :key="`built-in-${widget.id}`"
            class="widgets-market-card"
            :class="[`is-${widget.preview}`, `size-${widget.size.replace('x', '-')}`]"
          >
            <div class="widgets-preview-stage" :class="`preview-${widget.preview}`">
              <div v-if="widget.preview === 'weather'" class="widget-preview weather-preview">
                <div>
                  <span>{{ t('东京 · 晴朗', 'Tokyo · Clear') }}</span>
                  <strong>18°</strong>
                </div>
                <i class="fas fa-cloud-sun"></i>
              </div>
              <div v-else-if="widget.preview === 'calendar'" class="widget-preview calendar-preview">
                <span>{{ widgetPreviewWeekday }}</span>
                <strong>{{ widgetPreviewDate.getDate() }}</strong>
                <small>{{ t('日历', 'Calendar') }}</small>
              </div>
              <div v-else-if="widget.preview === 'music'" class="widget-preview music-preview">
                <span class="music-art"><i class="fas fa-music"></i></span>
                <div>
                  <strong>{{ t('晚间电台', 'Evening Radio') }}</strong>
                  <small>{{ t('日常播放列表', 'Daily Mix') }}</small>
                </div>
                <span class="music-control"><i class="fas fa-play"></i></span>
              </div>
              <div v-else-if="widget.preview === 'system'" class="widget-preview system-preview">
                <span><i class="fas fa-microchip"></i>{{ t('系统', 'System') }}</span>
                <span><i class="fas fa-battery-three-quarters"></i>86%</span>
                <div></div>
              </div>
              <div v-else-if="widget.preview === 'heart'" class="widget-preview square-preview heart-preview">
                <i class="fas fa-heart"></i>
              </div>
              <div v-else class="widget-preview square-preview disc-preview">
                <i class="fas fa-compact-disc"></i>
              </div>
            </div>
            <div class="widgets-market-info">
              <div>
                <h3>{{ widget.label }}</h3>
                <span>{{ widget.size }}</span>
              </div>
              <button class="widgets-action-btn" type="button" @click="restoreBuiltInWidget(widget.id)">
                {{ widget.visible ? t('恢复', 'Restore') : t('添加', 'Add') }}
              </button>
            </div>
          </article>
        </div>
      </section>

      <section v-else-if="activePanel === 'custom'" class="widgets-section">
        <div class="widgets-section-head">
          <div>
            <h2>{{ t('自定义组件', 'Custom widgets') }}</h2>
            <p>{{ t('选择一个起步样式，再改成自己的主屏组件。', 'Start from a style, then make it your own Home widget.') }}</p>
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

        <div class="widgets-starter-templates">
          <div class="widgets-section-subhead">
            <h3>{{ t('从样式开始', 'Start from a style') }}</h3>
            <span>{{ officialStylePresetStates.length }}</span>
          </div>
          <div class="widgets-template-strip">
            <button
              v-for="preset in officialStylePresetStates"
              :key="`starter-${preset.id}`"
              class="widgets-template-card"
              :class="[`size-${preset.size.replace('x', '-')}`]"
              type="button"
              @click="applyStylePresetToCustomForm(preset)"
            >
              <span class="widgets-template-thumb">
                <span v-if="preset.preview === 'charm'" class="template-thumb-art is-charm"></span>
                <span v-else-if="preset.preview === 'capsule'" class="template-thumb-art is-capsule"></span>
                <span v-else-if="preset.preview === 'diary'" class="template-thumb-art is-diary"></span>
                <span v-else-if="preset.preview === 'day'" class="template-thumb-art is-day"></span>
                <span v-else-if="preset.preview === 'board'" class="template-thumb-art is-board"></span>
                <span v-else-if="preset.preview === 'island_v2'" class="template-thumb-art is-island"></span>
                <span v-else-if="preset.preview === 'polaroid'" class="template-thumb-art is-polaroid"></span>
                <span v-else-if="preset.preview === 'orb'" class="template-thumb-art is-orb"></span>
                <span v-else-if="preset.preview === 'island'" class="template-thumb-art is-island"></span>
                <span v-else-if="preset.preview === 'pass'" class="template-thumb-art is-pass"></span>
                <span v-else-if="preset.preview === 'live'" class="template-thumb-art is-live"></span>
                <span v-else class="template-thumb-art is-magazine"></span>
              </span>
              <strong>{{ preset.label }}</strong>
              <small>{{ preset.size }}</small>
            </button>
          </div>
        </div>

        <div class="widgets-custom-composer">
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

            <div class="widgets-action-config">
              <div class="widgets-action-config-head">
                <span>
                  <i class="fas fa-arrow-pointer"></i>
                  {{ t('点击动作', 'Click action') }}
                </span>
                <strong>{{ customWidgetActionType === CUSTOM_WIDGET_ACTION_TYPE_NONE ? t('无动作', 'No action') : t('已配置', 'Configured') }}</strong>
              </div>
              <div class="widgets-form-grid">
                <label class="widgets-field">
                  <span>{{ t('动作类型', 'Action type') }}</span>
                  <select v-model="customWidgetActionType" @change="ensureCustomWidgetActionTarget">
                    <option
                      v-for="actionType in customWidgetActionTypes"
                      :key="actionType.id"
                      :value="actionType.id"
                    >
                      {{ actionType.label }}
                    </option>
                  </select>
                </label>

                <label
                  v-if="customWidgetActionType !== CUSTOM_WIDGET_ACTION_TYPE_NONE"
                  class="widgets-field"
                >
                  <span>{{ t('目标入口', 'Target') }}</span>
                  <select v-model="customWidgetActionTarget">
                    <option
                      v-for="target in currentCustomWidgetActionTargets"
                      :key="target.id"
                      :value="target.id"
                    >
                      {{ target.label }}
                    </option>
                  </select>
                </label>
              </div>
            </div>

            <label class="widgets-field">
              <span>{{ t('Widget 内容', 'Widget content') }}</span>
              <div class="widgets-code-snippets" :aria-label="t('插入占位符', 'Insert placeholder')">
                <button
                  v-for="snippet in CODE_SNIPPET_OPTIONS"
                  :key="snippet.id"
                  type="button"
                  @click="insertCodeSnippet(snippet.snippet)"
                >
                  <i :class="snippet.icon"></i>
                  <span>{{ t(snippet.labelZh, snippet.labelEn) }}</span>
                </button>
              </div>
              <textarea
                ref="customWidgetCodeTextarea"
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

          <aside class="widgets-live-preview">
            <div class="widgets-live-preview-head">
              <span>{{ t('预览', 'Preview') }}</span>
              <strong>{{ customWidgetDraftSize }}</strong>
            </div>
            <div
              v-if="hasCustomWidgetDraftPreview"
              class="widgets-created-preview widgets-draft-preview"
              :class="`size-${customWidgetDraftSize.replace('x', '-')}`"
            >
              <iframe
                :srcdoc="customWidgetPreviewSrcDoc(customWidgetDraftPreview)"
                sandbox="allow-scripts"
                loading="lazy"
                referrerpolicy="no-referrer"
                title="Widget draft preview"
              ></iframe>
            </div>
            <div v-else class="widgets-draft-empty">
              <i class="fas fa-wand-magic-sparkles"></i>
              <span>{{ t('选择样式或输入代码后显示预览。', 'Choose a style or enter code to preview.') }}</span>
            </div>
            <div class="widgets-live-preview-meta">
              <span>
                <i class="fas fa-tag"></i>
                {{ customWidgetName || t('未命名', 'Untitled') }}
              </span>
              <span>
                <i class="fas fa-arrow-pointer"></i>
                {{ customWidgetActionType === CUSTOM_WIDGET_ACTION_TYPE_NONE ? t('无动作', 'No action') : t('已配置', 'Configured') }}
              </span>
            </div>
          </aside>
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
            <div class="widgets-created-preview" :class="`size-${widget.size.replace('x', '-')}`">
              <iframe
                :srcdoc="customWidgetPreviewSrcDoc(widget)"
                sandbox="allow-scripts"
                loading="lazy"
                referrerpolicy="no-referrer"
                title="Widget preview"
              ></iframe>
            </div>
            <div>
              <h4>{{ widget.name }}</h4>
              <div class="widgets-created-meta">
                <span>{{ widget.size }}</span>
                <span>{{ customWidgetActionLabel(widget.action) }}</span>
              </div>
            </div>
            <div class="widgets-created-actions">
              <button type="button" @click="startEditCustomWidget(widget)">
                <i class="fas fa-pen"></i>
                <span>{{ t('编辑', 'Edit') }}</span>
              </button>
              <button type="button" class="is-danger" @click="removeCustomWidget(widget.id)">
                <i class="fas fa-trash"></i>
                <span>{{ t('删除', 'Delete') }}</span>
              </button>
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

        <div class="widgets-import-guide">
          <div>
            <i class="fas fa-file-code"></i>
            <span>{{ t('导入外观代码，不会自动占用主屏槽位。', 'Import visual code without placing it on Home automatically.') }}</span>
          </div>
          <div class="widgets-import-size-chips" :aria-label="t('支持尺寸', 'Supported sizes')">
            <span v-for="size in VALID_WIDGET_SIZES" :key="`import-size-${size}`">{{ size }}</span>
          </div>
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
          <p>{{ t(`支持 name、size、code 三项；尺寸支持 ${VALID_WIDGET_SIZES.join('、')}。`, `Supports name, size, and code; sizes: ${VALID_WIDGET_SIZES.join(', ')}.`) }}</p>
        </div>
      </section>
    </main>

    <div
      v-if="previewedStylePreset"
      class="widgets-style-preview-dialog"
      role="dialog"
      aria-modal="true"
      :aria-label="previewedStylePreset.label"
    >
      <button
        class="widgets-style-preview-backdrop"
        type="button"
        :aria-label="t('关闭预览', 'Close preview')"
        @click="closeStylePresetPreview"
      ></button>
      <section class="widgets-style-preview-sheet">
        <header class="widgets-style-preview-head">
          <div>
            <span>{{ t('组件预览', 'Widget preview') }}</span>
            <h3>{{ previewedStylePreset.label }}</h3>
          </div>
          <button class="widgets-icon-btn" type="button" :aria-label="t('关闭预览', 'Close preview')" @click="closeStylePresetPreview">
            <i class="fas fa-xmark"></i>
          </button>
        </header>

        <div class="widgets-style-preview-frame" :class="`size-${previewedStylePreset.size.replace('x', '-')}`">
          <iframe
            :srcdoc="customWidgetPreviewSrcDoc(previewedStylePreset)"
            sandbox="allow-scripts"
            loading="lazy"
            referrerpolicy="no-referrer"
            :title="previewedStylePreset.label"
          ></iframe>
        </div>

        <div class="widgets-style-preview-meta">
          <span>{{ previewedStylePreset.size }}</span>
          <p>{{ t('可以先加入库，也可以进入自定义继续改。', 'Add it to your library, or open it in Custom to edit.') }}</p>
        </div>

        <div class="widgets-style-preview-actions">
          <button class="widgets-secondary-btn" type="button" @click="addPreviewedStylePreset">
            <i class="fas fa-plus"></i>
            <span>{{ previewedStylePreset.added ? t('再加入库', 'Add again') : t('加入库', 'Add') }}</span>
          </button>
          <button class="widgets-primary-btn" type="button" @click="applyPreviewedStylePresetToCustomForm">
            <i class="fas fa-pen"></i>
            <span>{{ t('编辑此样式', 'Edit style') }}</span>
          </button>
        </div>
      </section>
    </div>

    <div
      v-if="importFeedbackMessage"
      class="widgets-feedback"
      :class="`is-${importFeedbackType || 'success'}`"
      aria-live="polite"
    >
      <p>{{ importFeedbackMessage }}</p>
      <span v-for="(detail, idx) in importFeedbackDetails" :key="`widget-feedback-${idx}`">{{ detail }}</span>
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

.widgets-heading > span {
  display: block;
  color: var(--system-text-muted);
  font-size: 11px;
  font-weight: 600;
  line-height: 1.2;
}

.widgets-title-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 7px;
  margin-top: 2px;
}

.widgets-heading h1 {
  margin: 0;
  font-size: 24px;
  font-weight: 700;
  line-height: 1.1;
  letter-spacing: 0;
}

.widgets-saved-inline {
  min-height: 24px;
  border: 1px solid color-mix(in srgb, var(--system-success) 28%, transparent);
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 0 8px;
  color: var(--system-success);
  background: color-mix(in srgb, var(--system-success) 10%, var(--system-control-bg));
  box-shadow: inset 0 1px 0 var(--system-edge-highlight);
  font-size: 11px;
  font-weight: 800;
  line-height: 1;
}

.widgets-icon-btn,
.widgets-home-btn,
.widgets-tab,
.widgets-template-card,
.widgets-action-btn,
.widgets-primary-btn,
.widgets-secondary-btn,
.widgets-bridge-action,
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
.widgets-secondary-btn:active,
.widgets-bridge-action:active {
  transform: scale(0.97);
}

.widgets-content {
  flex: 1;
  overflow-y: auto;
  padding: 10px 16px 104px;
}

.widgets-bridge-panel {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 9px;
  margin-bottom: 10px;
}

.widgets-bridge-action {
  min-height: 60px;
  border: 1px solid var(--system-subtle-border);
  border-radius: 19px;
  display: grid;
  grid-template-columns: 38px minmax(0, 1fr);
  align-items: center;
  gap: 10px;
  padding: 10px;
  color: var(--system-text);
  background: var(--system-panel-bg);
  box-shadow: var(--system-shadow-control);
  text-align: left;
  transition: transform var(--system-motion-fast), background var(--system-motion-fast);
}

.widgets-bridge-action.is-primary {
  color: var(--system-text-inverse);
  background: var(--system-accent);
  border-color: var(--system-accent);
}

.widgets-bridge-icon {
  width: 36px;
  height: 36px;
  border-radius: 14px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--system-control-bg);
  color: var(--system-text);
}

.widgets-bridge-action.is-primary .widgets-bridge-icon {
  color: var(--system-accent);
  background: var(--system-text-inverse);
}

.widgets-bridge-action strong,
.widgets-bridge-action small {
  display: block;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.widgets-bridge-action strong {
  font-size: 13px;
  line-height: 1.2;
}

.widgets-bridge-action small {
  margin-top: 2px;
  opacity: 0.72;
  font-size: 10px;
  font-weight: 700;
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

.widgets-code-snippets {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.widgets-code-snippets button {
  min-height: 30px;
  border: 1px solid var(--system-subtle-border);
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 0 9px;
  color: var(--system-text);
  background: var(--system-surface-muted);
  cursor: pointer;
  font: inherit;
  font-size: 10px;
  font-weight: 800;
  -webkit-tap-highlight-color: transparent;
}

.widgets-code-snippets button:active {
  transform: scale(0.97);
}

.widgets-import-textarea {
  min-height: 220px;
}

.widgets-market-grid,
.widgets-form,
.widgets-created,
.widgets-starter-templates {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.widgets-market-tools {
  display: grid;
  gap: 8px;
  margin-bottom: 10px;
}

.widgets-market-tools > span {
  color: var(--system-text-muted);
  font-size: 11px;
  font-weight: 750;
}

.widgets-size-filter {
  display: flex;
  gap: 7px;
  overflow-x: auto;
  padding-bottom: 2px;
  scrollbar-width: none;
}

.widgets-size-filter::-webkit-scrollbar {
  display: none;
}

.widgets-size-filter button {
  flex: 0 0 auto;
  min-height: 34px;
  border: 1px solid var(--system-control-border);
  border-radius: 999px;
  padding: 0 12px;
  color: var(--system-text-muted);
  background: var(--system-control-bg);
  font: inherit;
  font-size: 11px;
  font-weight: 850;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.widgets-size-filter button.is-active {
  color: var(--system-text-inverse);
  background: var(--system-accent);
  border-color: transparent;
  box-shadow: 0 8px 18px rgba(68, 111, 135, 0.18);
}

.widgets-starter-templates {
  margin-bottom: 12px;
}

.widgets-template-strip {
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: 112px;
  gap: 8px;
  overflow-x: auto;
  padding: 1px 1px 3px;
  scrollbar-width: none;
}

.widgets-template-strip::-webkit-scrollbar {
  display: none;
}

.widgets-template-card {
  min-width: 0;
  min-height: 116px;
  border: 1px solid var(--system-subtle-border);
  border-radius: 18px;
  display: flex;
  flex-direction: column;
  gap: 7px;
  padding: 9px;
  color: var(--system-text);
  background: var(--system-control-bg);
  box-shadow: inset 0 1px 0 var(--system-edge-highlight);
  text-align: left;
  cursor: pointer;
  font: inherit;
  -webkit-tap-highlight-color: transparent;
  transition: transform var(--system-motion-fast), border-color var(--system-motion-fast), background var(--system-motion-fast);
}

.widgets-template-card:active {
  transform: scale(0.98);
}

.widgets-template-thumb {
  position: relative;
  min-height: 56px;
  border-radius: 14px;
  display: block;
  overflow: hidden;
  background:
    radial-gradient(circle at 20% 18%, rgba(255, 255, 255, 0.62), transparent 30%),
    linear-gradient(145deg, rgba(124, 147, 156, 0.32), rgba(70, 84, 91, 0.2));
}

.widgets-template-card.size-1-1 .widgets-template-thumb {
  width: 58px;
  min-height: 58px;
  margin: 0 auto;
}

.widgets-template-card.size-2-1 .widgets-template-thumb {
  min-height: 42px;
  border-radius: 999px;
}

.widgets-template-card.size-4-1 .widgets-template-thumb {
  min-height: 42px;
  border-radius: 999px;
}

.widgets-template-card.size-4-2 .widgets-template-thumb {
  min-height: 50px;
}

.widgets-template-card.size-4-3 .widgets-template-thumb {
  min-height: 62px;
}

.widgets-template-card.size-4-4 .widgets-template-thumb {
  min-height: 70px;
}

.template-thumb-art {
  position: absolute;
  inset: 8px;
  border-radius: 13px;
}

.template-thumb-art.is-charm {
  inset: 9px;
  border-radius: 50%;
  background:
    radial-gradient(circle at 31% 22%, #fff 0 18%, rgba(255, 255, 255, 0.32) 19% 42%, transparent 43%),
    linear-gradient(145deg, #f8dce4, #8fa7ad);
  box-shadow: 0 8px 18px rgba(24, 31, 38, 0.15);
}

.template-thumb-art.is-capsule {
  inset: 9px 7px;
  border-radius: 999px;
  background:
    radial-gradient(circle at 22% 50%, rgba(255, 255, 255, 0.9) 0 13%, transparent 14%),
    linear-gradient(135deg, #fff3f5, #e5c8cf 62%, #c9d9dc);
}

.template-thumb-art.is-diary {
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.5) 0 58%, transparent 59%),
    radial-gradient(circle at 75% 20%, rgba(255, 255, 255, 0.8) 0 15%, transparent 16%),
    linear-gradient(145deg, #d9e4e7, #f4dfe7);
}

.template-thumb-art.is-day {
  background:
    linear-gradient(90deg, rgba(255, 255, 255, 0.52) 0 35%, transparent 36%),
    repeating-linear-gradient(180deg, transparent 0 12px, rgba(255, 255, 255, 0.42) 13px 23px),
    linear-gradient(135deg, #f8edf1, #cfdce0);
}

.template-thumb-art.is-board {
  background:
    linear-gradient(112deg, transparent 0 14%, rgba(255, 255, 255, 0.66) 15% 37%, transparent 38%),
    radial-gradient(circle at 74% 26%, rgba(255, 255, 255, 0.78) 0 12%, transparent 13%),
    linear-gradient(145deg, #f7edf2, #8fa8af);
}

.template-thumb-art.is-polaroid {
  background:
    linear-gradient(112deg, transparent 0 20%, rgba(255, 255, 255, 0.88) 20% 54%, transparent 54%),
    linear-gradient(145deg, #f6f1ea, #cfd8dd);
}

.template-thumb-art.is-orb {
  inset: 11px;
  border-radius: 50%;
  background: radial-gradient(circle at 30% 20%, #fff, rgba(255, 255, 255, 0.24) 26%, rgba(82, 101, 110, 0.38));
  box-shadow: 0 8px 18px rgba(24, 31, 38, 0.18);
}

.template-thumb-art.is-island {
  inset: 7px;
  border-radius: 999px;
  background: linear-gradient(135deg, #242b32, #6a7776);
}

.template-thumb-art.is-pass {
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.52) 0 62%, transparent 62%),
    linear-gradient(150deg, #f5edf1, #c7d2da);
}

.template-thumb-art.is-live {
  background:
    radial-gradient(circle at 24% 48%, rgba(255, 255, 255, 0.62) 0 20%, transparent 21%),
    linear-gradient(135deg, #ffe8ef, #d6cad2);
}

.template-thumb-art.is-magazine {
  background:
    linear-gradient(180deg, rgba(45, 50, 56, 0.78) 0 18%, transparent 18%),
    linear-gradient(145deg, #efede8, #9facb0);
}

.widgets-template-card strong,
.widgets-template-card small {
  display: block;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.widgets-template-card strong {
  font-size: 12px;
  line-height: 1.2;
}

.widgets-template-card small {
  color: var(--system-text-muted);
  font-size: 10px;
  font-weight: 800;
}

.widgets-custom-composer {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 12px;
}

.widgets-live-preview {
  order: -1;
  border: 1px solid var(--system-subtle-border);
  border-radius: 24px;
  background:
    radial-gradient(circle at 18% 10%, color-mix(in srgb, var(--system-accent-soft) 72%, transparent), transparent 34%),
    var(--system-surface-muted);
  box-shadow: inset 0 1px 0 var(--system-edge-highlight), var(--system-shadow-control);
  padding: 12px;
}

.widgets-live-preview-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 10px;
  color: var(--system-text-muted);
  font-size: 11px;
  font-weight: 800;
}

.widgets-live-preview-head strong {
  border-radius: 999px;
  padding: 4px 8px;
  color: var(--system-text);
  background: var(--system-control-bg);
  border: 1px solid var(--system-control-border);
  font-size: 10px;
}

.widgets-live-preview-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 10px;
}

.widgets-live-preview-meta span {
  min-width: 0;
  max-width: 100%;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 8px;
  color: var(--system-text-muted);
  background: var(--system-control-bg);
  border: 1px solid var(--system-control-border);
  font-size: 10px;
  font-weight: 800;
  line-height: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.widgets-live-preview-meta i {
  flex: 0 0 auto;
  color: var(--system-accent);
}

.widgets-custom-composer > .widgets-form {
  border: 1px solid var(--system-subtle-border);
  border-radius: 22px;
  background: var(--system-control-bg);
  box-shadow: inset 0 1px 0 var(--system-edge-highlight);
  padding: 12px;
}

.widgets-draft-preview {
  background:
    radial-gradient(circle at 18% 12%, rgba(255, 255, 255, 0.62), transparent 28%),
    linear-gradient(145deg, rgba(124, 147, 156, 0.36), rgba(70, 84, 91, 0.22));
}

.widgets-draft-empty {
  min-height: 132px;
  border: 1px dashed var(--system-control-border);
  border-radius: 18px;
  display: grid;
  place-items: center;
  gap: 8px;
  padding: 18px;
  color: var(--system-text-muted);
  text-align: center;
  font-size: 12px;
  font-weight: 700;
  line-height: 1.35;
}

.widgets-draft-empty i {
  font-size: 18px;
  color: var(--system-accent);
}

.widgets-created-item {
  border: 1px solid var(--system-subtle-border);
  border-radius: 20px;
  background: var(--system-control-bg);
  padding: 11px;
}

.widgets-market-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  align-items: stretch;
}

.widgets-market-card {
  min-width: 0;
  border: 1px solid var(--system-subtle-border);
  border-radius: 22px;
  background: var(--system-control-bg);
  box-shadow: inset 0 1px 0 var(--system-edge-highlight);
  overflow: hidden;
}

.widgets-market-card.is-style-preset {
  order: 1;
}

.widgets-market-card:not(.is-style-preset) {
  order: 2;
}

.widgets-market-card.size-4-1,
.widgets-market-card.size-4-2,
.widgets-market-card.size-4-3,
.widgets-market-card.size-4-4 {
  grid-column: 1 / -1;
}

.widgets-preview-stage {
  position: relative;
  min-height: 142px;
  padding: 10px;
  display: flex;
  align-items: stretch;
  justify-content: center;
  background:
    radial-gradient(circle at 18% 12%, rgba(255, 255, 255, 0.58), transparent 28%),
    linear-gradient(145deg, rgba(124, 147, 156, 0.34), rgba(70, 84, 91, 0.2));
}

.widgets-preview-open {
  width: 100%;
  border: 0;
  cursor: zoom-in;
  font: inherit;
  text-align: left;
  -webkit-tap-highlight-color: transparent;
}

.widgets-preview-open:focus-visible {
  outline: 2px solid var(--system-accent);
  outline-offset: -4px;
}

.widgets-market-card.size-1-1 .widgets-preview-stage {
  min-height: 118px;
}

.widgets-market-card.size-2-1 .widgets-preview-stage {
  min-height: 96px;
}

.widgets-market-card.size-4-1 .widgets-preview-stage {
  min-height: 86px;
}

.widgets-market-card.size-4-2 .widgets-preview-stage {
  min-height: 128px;
}

.widgets-market-card.size-4-3 .widgets-preview-stage {
  min-height: 178px;
}

.widgets-market-card.size-4-4 .widgets-preview-stage {
  min-height: 230px;
}

.widget-preview {
  width: 100%;
  height: 100%;
  min-height: 96px;
  border-radius: 20px;
  color: #fff;
  box-shadow:
    0 14px 30px rgba(16, 24, 40, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.36);
}

.weather-preview {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 16px;
  background: linear-gradient(145deg, #8db7c8, #526d79 70%);
}

.weather-preview span,
.weather-preview small,
.music-preview small,
.calendar-preview small {
  font-size: 11px;
  font-weight: 750;
  opacity: 0.76;
}

.weather-preview strong {
  display: block;
  margin-top: 6px;
  font-size: 32px;
  line-height: 1;
}

.weather-preview i {
  font-size: 25px;
  opacity: 0.92;
}

.calendar-preview {
  display: grid;
  align-content: center;
  justify-items: center;
  gap: 6px;
  padding: 14px;
  background: linear-gradient(160deg, #f1efea, #b9c2c7);
  color: #28323a;
}

.calendar-preview span {
  border-radius: 999px;
  padding: 4px 9px;
  background: rgba(255, 255, 255, 0.52);
  font-size: 10px;
  font-weight: 800;
}

.calendar-preview strong {
  font-size: 42px;
  line-height: 0.9;
}

.music-preview {
  min-height: 104px;
  display: grid;
  grid-template-columns: 78px minmax(0, 1fr) 38px;
  align-items: center;
  gap: 12px;
  padding: 13px;
  background: linear-gradient(135deg, #2b3037, #65716d);
}

.music-art,
.music-control {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.music-art {
  width: 78px;
  height: 78px;
  border-radius: 18px;
  background:
    radial-gradient(circle, rgba(255, 255, 255, 0.88) 0 9%, transparent 10%),
    conic-gradient(from 120deg, #d6c8ad, #536a75, #1e252b, #d6c8ad);
}

.music-preview strong {
  display: block;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 15px;
  line-height: 1.2;
}

.music-control {
  width: 36px;
  height: 36px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.2);
}

.system-preview {
  display: grid;
  grid-template-columns: 1fr 1fr;
  align-content: center;
  gap: 10px;
  padding: 14px;
  background: linear-gradient(145deg, #58666c, #26333c);
}

.system-preview span {
  min-height: 38px;
  border-radius: 14px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  background: rgba(255, 255, 255, 0.14);
  font-size: 11px;
  font-weight: 800;
}

.system-preview div {
  grid-column: 1 / -1;
  height: 12px;
  border-radius: 999px;
  background:
    linear-gradient(90deg, rgba(255, 255, 255, 0.84) 0 68%, rgba(255, 255, 255, 0.18) 68% 100%),
    rgba(255, 255, 255, 0.16);
}

.square-preview {
  display: grid;
  place-items: center;
  aspect-ratio: 1;
  min-height: 0;
  width: min(100%, 98px);
  height: auto;
  margin: auto;
  font-size: 28px;
}

.heart-preview {
  background: linear-gradient(145deg, #d7a5a2, #8f5e65);
}

.disc-preview {
  background:
    radial-gradient(circle, rgba(255, 255, 255, 0.82) 0 8%, rgba(44, 51, 59, 0.86) 9% 21%, transparent 22%),
    conic-gradient(from 40deg, #c4cdd2, #6c7779, #2f3a43, #c4cdd2);
}

.style-preview {
  color: #30343a;
}

.charm-preview {
  display: grid;
  place-items: center;
  aspect-ratio: 1;
  width: min(100%, 98px);
  min-height: 0;
  height: auto;
  margin: auto;
  background: linear-gradient(145deg, #fff4f7, #c9d7dc 72%);
  overflow: hidden;
}

.charm-preview::before {
  content: "";
  position: absolute;
  inset: -18px;
  background:
    radial-gradient(circle at 26% 18%, rgba(255, 255, 255, 0.94) 0 10%, transparent 11%),
    radial-gradient(circle at 72% 18%, rgba(238, 177, 190, 0.66) 0 7%, transparent 8%),
    radial-gradient(circle at 20% 78%, rgba(175, 194, 201, 0.54) 0 8%, transparent 9%);
}

.charm-preview span {
  position: relative;
  width: 78%;
  aspect-ratio: 1;
  border-radius: 50%;
  display: grid;
  place-items: center;
  text-align: center;
  background: radial-gradient(circle at 30% 22%, rgba(255, 255, 255, 0.95), rgba(255, 255, 255, 0.32) 28%, rgba(204, 151, 162, 0.38) 62%, rgba(91, 107, 116, 0.22));
  border: 1px solid rgba(255, 255, 255, 0.66);
  box-shadow: inset 0 0 18px rgba(255, 255, 255, 0.38), 0 14px 24px rgba(80, 92, 104, 0.18);
}

.charm-preview strong {
  display: block;
  color: #674b55;
  font-size: 23px;
  line-height: 0.9;
}

.charm-preview small {
  display: block;
  margin-top: 2px;
  color: rgba(103, 75, 85, 0.68);
  font-size: 8px;
  font-weight: 850;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.capsule-preview {
  min-height: 58px;
  border-radius: 999px;
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  background: linear-gradient(135deg, rgba(252, 246, 247, 0.96), rgba(238, 213, 218, 0.92) 54%, rgba(216, 229, 232, 0.96));
  color: #8a5d67;
}

.capsule-preview > span {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  background: linear-gradient(145deg, #fff, #e6b8c2);
  box-shadow: inset 0 0 0 2px rgba(255, 255, 255, 0.82), 0 4px 10px rgba(126, 88, 98, 0.18);
}

.capsule-preview div {
  min-width: 0;
}

.capsule-preview small {
  display: block;
  font-size: 9px;
  font-weight: 900;
  letter-spacing: 0.08em;
  opacity: 0.68;
  text-transform: uppercase;
}

.capsule-preview strong {
  display: block;
  margin-top: 1px;
  color: #cf8793;
  font-size: 21px;
  line-height: 1;
}

.capsule-preview b {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: rgba(255, 255, 255, 0.48);
}

.diary-preview {
  position: relative;
  display: grid;
  grid-template-rows: auto 1fr auto;
  padding: 16px 14px 12px;
  background: linear-gradient(160deg, #d9e4e7, #f6e4ea);
  overflow: hidden;
}

.diary-preview::before {
  content: "";
  position: absolute;
  inset: 9px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.38);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.74);
}

.diary-preview h4,
.diary-preview p,
.diary-preview > span {
  position: relative;
  z-index: 1;
}

.diary-preview h4 {
  margin: 0;
  font-size: 30px;
  line-height: 0.92;
}

.diary-preview p {
  align-self: center;
  margin: 0;
  color: rgba(32, 40, 47, 0.72);
  font-size: 12px;
  font-weight: 700;
  line-height: 1.35;
}

.diary-preview > span {
  min-height: 44px;
  border-radius: 999px;
  display: grid;
  grid-template-columns: 30px 1fr;
  align-items: center;
  gap: 9px;
  padding: 0 12px;
  background: rgba(255, 255, 255, 0.6);
}

.diary-preview i {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: linear-gradient(145deg, #e8b5c0, #7f9aa3);
}

.diary-preview small {
  color: rgba(32, 40, 47, 0.68);
  font-size: 11px;
  font-weight: 800;
}

.polaroid-preview {
  position: relative;
  background: linear-gradient(145deg, #f6f1ea, #cfd8dd);
}

.polaroid-preview span {
  position: absolute;
  border-radius: 14px;
  background: #fff;
  box-shadow: 0 10px 20px rgba(46, 55, 63, 0.16);
}

.polaroid-preview span:first-child {
  inset: 26px 39px 35px 20px;
  transform: rotate(-8deg);
}

.polaroid-preview span:nth-child(2) {
  inset: 29px 21px 29px 44px;
  transform: rotate(7deg);
}

.polaroid-preview strong {
  position: absolute;
  left: 16px;
  bottom: 14px;
  font-size: 12px;
}

.orb-preview {
  display: grid;
  place-items: center;
  background: radial-gradient(circle at 48% 36%, rgba(255, 255, 255, 0.34), rgba(121, 144, 154, 0.42));
}

.orb-preview span {
  width: 72%;
  aspect-ratio: 1;
  border-radius: 50%;
  display: grid;
  place-items: center;
  color: #fff;
  font-size: 28px;
  background: radial-gradient(circle at 30% 20%, rgba(255, 255, 255, 0.9), rgba(255, 255, 255, 0.22) 25%, rgba(82, 101, 110, 0.36));
  border: 1px solid rgba(255, 255, 255, 0.54);
  box-shadow: inset 0 0 26px rgba(255, 255, 255, 0.28), 0 16px 30px rgba(24, 31, 38, 0.2);
}

.island-preview {
  min-height: 58px;
  border-radius: 999px;
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  background: linear-gradient(135deg, #242b32, #6a7776);
  color: #fff;
}

.island-preview i {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: rgba(255, 255, 255, 0.16);
  font-style: normal;
}

.island-preview strong,
.live-preview strong {
  display: block;
  font-size: 14px;
  line-height: 1.2;
}

.island-preview small,
.live-preview small {
  display: block;
  margin-top: 2px;
  font-size: 10px;
  opacity: 0.72;
}

.pass-preview {
  padding: 13px;
  display: grid;
  grid-template-rows: 1fr auto auto;
  gap: 6px;
  background: linear-gradient(150deg, #f5edf1, #c7d2da);
}

.pass-preview span {
  border-radius: 16px;
  background: linear-gradient(135deg, #f8d9df, #879aa4);
}

.pass-preview strong {
  font-size: 15px;
}

.pass-preview small {
  color: #69727a;
  font-size: 10px;
  font-weight: 800;
  text-transform: uppercase;
}

.day-preview {
  display: grid;
  grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.35fr);
  align-items: stretch;
  gap: 14px;
  padding: 14px;
  background: linear-gradient(140deg, #f7edf1, #cfdce0);
}

.day-preview > span {
  border-radius: 22px;
  display: grid;
  align-content: center;
  justify-items: center;
  gap: 4px;
  background: rgba(255, 255, 255, 0.52);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.76);
}

.day-preview span strong {
  color: #836570;
  font-size: 42px;
  line-height: 0.9;
}

.day-preview span small {
  color: #8a6b76;
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 0.08em;
}

.day-preview div {
  min-width: 0;
  display: grid;
  align-content: center;
  gap: 8px;
}

.day-preview h4 {
  margin: 0 0 2px;
  font-size: 18px;
  line-height: 1.1;
}

.day-preview p {
  margin: 0;
  border-radius: 14px;
  padding: 8px 10px;
  background: rgba(255, 255, 255, 0.42);
  color: #5d6770;
  font-size: 12px;
  font-weight: 750;
}

.board-preview {
  position: relative;
  display: block;
  padding: 16px;
  background: linear-gradient(145deg, #f7edf2, #c8d8dc);
  overflow: hidden;
}

.board-stage {
  position: absolute;
  inset: 16px;
  border-radius: 24px;
  background: linear-gradient(155deg, #eef4f4, #8da5ac);
  overflow: hidden;
}

.board-stage span {
  position: absolute;
  left: 22px;
  top: 30px;
  width: 112px;
  height: 136px;
  border-radius: 24px;
  background: linear-gradient(150deg, #fff7f9, #d7a7b2);
  box-shadow: 0 16px 28px rgba(95, 101, 110, 0.18);
  transform: rotate(-6deg);
}

.board-stage i {
  position: absolute;
  right: 30px;
  top: 24px;
  width: 78px;
  height: 78px;
  border-radius: 50%;
  background: radial-gradient(circle, #fff 0 18%, rgba(255, 255, 255, 0.2) 19% 36%, #7f979f 37% 62%, transparent 63%);
  box-shadow: 0 12px 24px rgba(41, 51, 58, 0.18);
}

.board-stage b {
  position: absolute;
  right: 24px;
  bottom: 24px;
  width: 168px;
  height: 88px;
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.42);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.78);
}

.board-preview > div:last-child {
  position: relative;
  z-index: 1;
  display: grid;
  gap: 3px;
  max-width: 210px;
  margin: 42px 0 0 34px;
  border-radius: 22px;
  padding: 14px 16px;
  background: rgba(255, 255, 255, 0.48);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.78);
}

.board-preview strong {
  color: #2f363c;
  font-size: 21px;
  line-height: 1.05;
}

.board-preview small {
  color: #637079;
  font-size: 12px;
  font-weight: 750;
}

.live-preview {
  display: grid;
  grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.2fr);
  align-items: center;
  gap: 12px;
  padding: 14px;
  background: linear-gradient(135deg, #ffe8ef, #d6cad2);
  color: #5f3a47;
}

.live-preview > span {
  min-height: 82px;
  border-radius: 20px;
  display: grid;
  place-items: center;
  background: rgba(255, 255, 255, 0.48);
  font-size: 34px;
}

.magazine-preview {
  position: relative;
  min-height: 204px;
  padding: 18px;
  background: linear-gradient(145deg, #efede8, #9facb0);
  overflow: hidden;
  font-family: Georgia, 'Times New Roman', serif;
}

.magazine-preview span {
  position: absolute;
  inset: 70px 24px 44px;
  border-radius: 22px;
  background: linear-gradient(160deg, #cfd8dc, #6f838c);
  box-shadow: 0 18px 38px rgba(22, 30, 38, 0.2);
}

.magazine-preview strong {
  position: relative;
  z-index: 1;
  font-size: 32px;
  line-height: 0.9;
  letter-spacing: 0;
}

.magazine-preview small {
  position: absolute;
  left: 18px;
  bottom: 16px;
  z-index: 1;
  font: 800 12px/1.2 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

.widgets-market-info {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
  padding: 10px;
}

.widgets-market-info h3 {
  margin: 0;
  font-size: 13px;
  font-weight: 800;
  line-height: 1.2;
}

.widgets-market-info span {
  display: inline-flex;
  margin-top: 5px;
  border-radius: 999px;
  padding: 4px 7px;
  color: var(--system-text-muted);
  background: var(--system-surface-muted);
  border: 1px solid var(--system-subtle-border);
  font-size: 10px;
  font-weight: 800;
  line-height: 1;
}

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

.widgets-action-config {
  border: 1px solid var(--system-subtle-border);
  border-radius: 20px;
  background: var(--system-surface-muted);
  padding: 11px;
}

.widgets-action-config-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 10px;
  color: var(--system-text-muted);
  font-size: 11px;
  font-weight: 800;
}

.widgets-action-config-head span {
  min-width: 0;
  display: inline-flex;
  align-items: center;
  gap: 7px;
}

.widgets-action-config-head strong {
  flex: 0 0 auto;
  border-radius: 999px;
  padding: 4px 8px;
  color: var(--system-text);
  background: var(--system-control-bg);
  border: 1px solid var(--system-control-border);
  font-size: 10px;
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
  position: relative;
  display: grid;
  gap: 10px;
  overflow: hidden;
  background:
    radial-gradient(circle at 18% 0%, color-mix(in srgb, var(--system-accent-soft) 64%, transparent), transparent 36%),
    var(--system-control-bg);
  box-shadow: inset 0 1px 0 var(--system-edge-highlight);
}

.widgets-created-preview {
  position: relative;
  min-height: 132px;
  border-radius: 18px;
  overflow: hidden;
  background:
    radial-gradient(circle at 18% 12%, rgba(255, 255, 255, 0.58), transparent 28%),
    linear-gradient(145deg, rgba(124, 147, 156, 0.34), rgba(70, 84, 91, 0.2));
}

.widgets-created-preview.size-1-1 {
  width: 104px;
  min-height: 104px;
}

.widgets-created-preview.size-2-1 {
  min-height: 94px;
}

.widgets-created-preview.size-4-1 {
  min-height: 88px;
}

.widgets-created-preview.size-4-3 {
  min-height: 188px;
}

.widgets-created-preview.size-4-4 {
  min-height: 232px;
}

.widgets-created-preview iframe {
  width: 100%;
  height: 100%;
  min-height: inherit;
  border: 0;
  display: block;
  pointer-events: none;
  background: transparent;
}

.widgets-created-item h4 {
  font-size: 14px;
  font-weight: 700;
}

.widgets-created-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 7px;
}

.widgets-created-meta span {
  max-width: 100%;
  border-radius: 999px;
  padding: 5px 8px;
  color: var(--system-text-muted);
  background: var(--system-surface-muted);
  border: 1px solid var(--system-subtle-border);
  font-size: 10px;
  font-weight: 750;
  line-height: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.widgets-created-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
}

.widgets-created-actions button {
  min-height: 34px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 0 11px;
  color: var(--system-text);
  background: var(--system-control-bg);
  border: 1px solid var(--system-control-border);
  font-size: 11px;
  font-weight: 700;
  -webkit-tap-highlight-color: transparent;
}

.widgets-created-actions button:active {
  transform: scale(0.97);
}

.widgets-created-actions i {
  font-size: 10px;
}

.widgets-created-actions button.is-danger {
  color: var(--system-danger);
  border-color: rgba(184, 83, 83, 0.22);
}

.widgets-import-guide {
  border: 1px solid var(--system-subtle-border);
  border-radius: 20px;
  display: grid;
  gap: 10px;
  margin-bottom: 10px;
  padding: 12px;
  background:
    radial-gradient(circle at 14% 0%, color-mix(in srgb, var(--system-accent-soft) 70%, transparent), transparent 38%),
    var(--system-surface-muted);
  box-shadow: inset 0 1px 0 var(--system-edge-highlight);
}

.widgets-import-guide > div:first-child {
  display: grid;
  grid-template-columns: 32px minmax(0, 1fr);
  align-items: center;
  gap: 9px;
  color: var(--system-text);
  font-size: 12px;
  line-height: 1.35;
  font-weight: 760;
}

.widgets-import-guide > div:first-child i {
  width: 32px;
  height: 32px;
  border-radius: 13px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--system-text-inverse);
  background: var(--system-accent);
  font-size: 13px;
}

.widgets-import-size-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.widgets-import-size-chips span {
  border-radius: 999px;
  padding: 5px 8px;
  color: var(--system-text-muted);
  background: var(--system-control-bg);
  border: 1px solid var(--system-control-border);
  font-size: 10px;
  font-weight: 850;
  line-height: 1;
}

.widgets-style-preview-dialog {
  position: absolute;
  inset: 0;
  z-index: 80;
  display: grid;
  align-items: end;
  pointer-events: none;
}

.widgets-style-preview-backdrop {
  position: absolute;
  inset: 0;
  border: 0;
  background: rgba(18, 25, 32, 0.28);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  pointer-events: auto;
}

.widgets-style-preview-sheet {
  position: relative;
  z-index: 1;
  display: grid;
  gap: 12px;
  max-height: min(82vh, 720px);
  margin: 0 12px calc(12px + env(safe-area-inset-bottom));
  border: 1px solid var(--system-card-border);
  border-radius: 28px;
  padding: 14px;
  overflow: auto;
  background: var(--system-elevated-bg);
  box-shadow: var(--system-shadow-soft);
  pointer-events: auto;
}

.widgets-style-preview-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.widgets-style-preview-head span {
  display: block;
  color: var(--system-text-muted);
  font-size: 11px;
  font-weight: 750;
}

.widgets-style-preview-head h3 {
  margin: 2px 0 0;
  color: var(--system-text);
  font-size: 20px;
  line-height: 1.1;
}

.widgets-style-preview-frame {
  position: relative;
  min-height: 220px;
  border-radius: 24px;
  overflow: hidden;
  background:
    radial-gradient(circle at 18% 12%, rgba(255, 255, 255, 0.58), transparent 28%),
    linear-gradient(145deg, rgba(124, 147, 156, 0.34), rgba(70, 84, 91, 0.2));
}

.widgets-style-preview-frame.size-1-1 {
  width: min(220px, 100%);
  min-height: auto;
  aspect-ratio: 1;
  justify-self: center;
}

.widgets-style-preview-frame.size-2-1 {
  min-height: 128px;
}

.widgets-style-preview-frame.size-2-2 {
  width: min(260px, 100%);
  min-height: auto;
  aspect-ratio: 1;
  justify-self: center;
}

.widgets-style-preview-frame.size-4-1 {
  min-height: 112px;
}

.widgets-style-preview-frame.size-4-2 {
  min-height: 170px;
}

.widgets-style-preview-frame.size-4-3 {
  min-height: 240px;
}

.widgets-style-preview-frame.size-4-4 {
  min-height: 320px;
}

.widgets-style-preview-frame iframe {
  width: 100%;
  height: 100%;
  min-height: inherit;
  border: 0;
  display: block;
  background: transparent;
}

.widgets-style-preview-frame.size-1-1 iframe,
.widgets-style-preview-frame.size-2-2 iframe {
  min-height: 0;
}

.widgets-style-preview-meta {
  display: grid;
  gap: 7px;
}

.widgets-style-preview-meta span {
  width: fit-content;
  border-radius: 999px;
  padding: 5px 9px;
  color: var(--system-text-muted);
  background: var(--system-surface-muted);
  border: 1px solid var(--system-subtle-border);
  font-size: 11px;
  font-weight: 850;
}

.widgets-style-preview-meta p {
  margin: 0;
  color: var(--system-text-muted);
  font-size: 12px;
  font-weight: 650;
  line-height: 1.4;
}

.widgets-style-preview-actions {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.2fr);
  gap: 8px;
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

.widgets-feedback {
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

@media (max-width: 380px) {
  .widgets-section-head,
  .widgets-head-actions,
  .widgets-bridge-panel,
  .widgets-form-actions,
  .widgets-import-actions,
  .widgets-style-preview-actions {
    align-items: stretch;
    flex-direction: column;
  }

  .widgets-style-preview-actions {
    display: flex;
  }

  .widgets-bridge-panel {
    grid-template-columns: 1fr;
  }

  .widgets-select-field select {
    min-width: 0;
  }

  .widgets-action-btn {
    width: 100%;
  }
}

@media (max-width: 340px) {
  .widgets-market-grid {
    grid-template-columns: 1fr;
  }

  .widgets-market-card.size-4-1,
  .widgets-market-card.size-4-2,
  .widgets-market-card.size-4-3,
  .widgets-market-card.size-4-4 {
    grid-column: auto;
  }

  .music-preview {
    grid-template-columns: 56px minmax(0, 1fr) 34px;
  }

  .music-art {
    width: 56px;
    height: 56px;
    border-radius: 14px;
  }
}
</style>
