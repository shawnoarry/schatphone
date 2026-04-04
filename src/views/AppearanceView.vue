<script setup>
import { computed, onBeforeUnmount, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import { useSystemStore } from '../stores/system'
import { useI18n } from '../composables/useI18n'
import { VALID_WIDGET_SIZES } from '../lib/widget-schema'

const CUSTOM_SIZE_OPTIONS = [...VALID_WIDGET_SIZES]
const ROOT_MENU = ''
const FONT_VAR_NAME = '--app-font-family'
const DEFAULT_FONT_STACK = '"Inter", "Noto Sans SC", sans-serif'

const FONT_PRESETS = [
  { id: 'system', label: '系统默认', value: DEFAULT_FONT_STACK },
  { id: 'inter', label: 'Inter', value: '"Inter", sans-serif' },
  { id: 'noto', label: 'Noto Sans SC', value: '"Noto Sans SC", sans-serif' },
  { id: 'pingfang', label: 'PingFang', value: '"PingFang SC", "Noto Sans SC", sans-serif' },
  { id: 'serif', label: '衬线 Serif', value: '"Noto Serif SC", serif' },
]
const BUILT_IN_WIDGET_OPTIONS = [
  { id: 'weather', label: '天气' },
  { id: 'calendar', label: '日历' },
  { id: 'music', label: '音乐' },
  { id: 'system', label: '系统状态' },
  { id: 'quick_heart', label: '快捷爱心' },
  { id: 'quick_disc', label: '快捷唱片' },
]
const LOCK_CLOCK_STYLE_OPTIONS = [
  { id: 'classic', label: '经典细体' },
  { id: 'outline', label: '描边样式' },
  { id: 'mono', label: '数字等宽' },
]

const router = useRouter()
const systemStore = useSystemStore()
const { t } = useI18n()

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
        name: t('示例天气卡', 'Sample Weather Card'),
        size: '2x2',
        code: "<div style='height:100%;display:flex;align-items:center;justify-content:center;border-radius:16px;background:rgba(255,255,255,.2);color:#fff;font:600 14px/1.4 \"Inter\",sans-serif;'>Weather 26°C</div>",
      },
      {
        name: t('示例快捷卡', 'Sample Quick Card'),
        size: '2x1',
        code: "<div style='height:100%;display:flex;align-items:center;justify-content:center;border-radius:12px;background:rgba(0,0,0,.35);color:#fff;font:600 12px/1.4 \"Inter\",sans-serif;'>Quick Action</div>",
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

const { settings, availableThemes } = storeToRefs(systemStore)

const activeMenu = ref(ROOT_MENU)
const saved = ref(false)
const templateCopied = ref(false)

let savedTimerId = null
let copiedTimerId = null

const customWidgetName = ref('')
const customWidgetSize = ref('2x2')
const customWidgetCode = ref('')
const customWidgetPage = ref(0)
const editingWidgetId = ref('')

const importJsonText = ref('')
const importTargetPage = ref(0)
const importFeedbackType = ref('')
const importFeedbackMessage = ref('')
const importFeedbackDetails = ref([])
const builtInWidgetPage = ref(0)
const customFontStackInput = ref('')

const customWidgets = computed(() => settings.value.appearance.customWidgets || [])
const homeWidgetPages = computed(() => settings.value.appearance.homeWidgetPages || [])
const pageOptions = computed(() =>
  Array.from({ length: Math.max(homeWidgetPages.value.length, 5) }, (_, index) => index),
)

const pageDisplayLabel = (pageIndex) => `${t('第', 'Screen ')}${pageIndex + 1}${t('屏', '')}`

const fontPresetLabel = (preset) => {
  if (preset.id === 'system') return t('系统默认', 'System default')
  if (preset.id === 'serif') return t('衬线 Serif', 'Serif')
  return preset.label
}

const builtInWidgetLabel = (widgetId) => {
  if (widgetId === 'weather') return t('天气', 'Weather')
  if (widgetId === 'calendar') return t('日历', 'Calendar')
  if (widgetId === 'music') return t('音乐', 'Music')
  if (widgetId === 'system') return t('系统状态', 'System Status')
  if (widgetId === 'quick_heart') return t('快捷爱心', 'Quick Heart')
  if (widgetId === 'quick_disc') return t('快捷唱片', 'Quick Disc')
  return t('组件', 'Widget')
}

const lockClockStyleLabel = (styleId) => {
  if (styleId === 'classic') return t('经典细体', 'Classic Thin')
  if (styleId === 'outline') return t('描边样式', 'Outline')
  if (styleId === 'mono') return t('数字等宽', 'Monospace')
  return styleId
}

const themeDisplayName = (theme) => {
  if (theme?.id === 'y2k') return t('Y2K 蒸汽波', 'Y2K Vapor')
  if (theme?.id === 'zen') return t('纯白', 'Pure White')
  return theme?.name || ''
}

const builtInWidgetStates = computed(() =>
  BUILT_IN_WIDGET_OPTIONS.map((item) => {
    const pageIndex = homeWidgetPages.value.findIndex((page) => page.includes(item.id))
    return {
      ...item,
      label: builtInWidgetLabel(item.id),
      pageIndex,
      visible: pageIndex >= 0,
      pageLabel: pageIndex >= 0 ? pageDisplayLabel(pageIndex) : t('已隐藏', 'Hidden'),
    }
  }),
)

const pageTitle = computed(() => {
  if (activeMenu.value === 'theme') return t('主题美化', 'Theme')
  if (activeMenu.value === 'font') return t('字体设置', 'Font')
  if (activeMenu.value === 'widget') return t('Widget 工坊', 'Widget Studio')
  return t('外观工坊', 'Appearance Studio')
})

const backLabel = computed(() =>
  activeMenu.value === ROOT_MENU ? t('设置', 'Settings') : t('外观工坊', 'Appearance Studio'),
)

const currentFontStack = computed(() => {
  const value = settings.value.appearance.customVars?.[FONT_VAR_NAME]
  return typeof value === 'string' && value.trim() ? value.trim() : DEFAULT_FONT_STACK
})

const triggerSaved = () => {
  systemStore.saveNow()
  saved.value = true
  if (savedTimerId) clearTimeout(savedTimerId)
  savedTimerId = setTimeout(() => {
    saved.value = false
  }, 1200)
}

const goHome = () => {
  router.push('/home')
}

const goSettings = () => {
  router.push('/settings')
}

const handleBack = () => {
  if (activeMenu.value !== ROOT_MENU) {
    activeMenu.value = ROOT_MENU
    return
  }
  goSettings()
}

const openMenu = (menu) => {
  activeMenu.value = menu
  if (menu === 'font') {
    customFontStackInput.value = currentFontStack.value
  }
}

const setTheme = (themeId) => {
  systemStore.setTheme(themeId)
  triggerSaved()
}

const clearCustomCss = () => {
  settings.value.appearance.customCss = ''
  triggerSaved()
}

const saveAppearance = () => {
  triggerSaved()
}

const toggleStatusBar = () => {
  settings.value.appearance.showStatusBar = settings.value.appearance.showStatusBar !== false ? false : true
  triggerSaved()
}

const toggleHapticFeedback = () => {
  settings.value.appearance.hapticFeedbackEnabled =
    settings.value.appearance.hapticFeedbackEnabled !== false ? false : true
  triggerSaved()
}

const setFontPreset = (value) => {
  systemStore.setCustomVar(FONT_VAR_NAME, value)
  customFontStackInput.value = value
  triggerSaved()
}

const applyCustomFontStack = () => {
  const value = customFontStackInput.value.trim() || DEFAULT_FONT_STACK
  systemStore.setCustomVar(FONT_VAR_NAME, value)
  triggerSaved()
}

const resetFontStack = () => {
  customFontStackInput.value = DEFAULT_FONT_STACK
  systemStore.setCustomVar(FONT_VAR_NAME, DEFAULT_FONT_STACK)
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
    setImportFeedback(
      'error',
      t('复制失败，请手动复制模板文本。', 'Copy failed. Please copy the template text manually.'),
    )
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

const resetCustomWidgetForm = () => {
  editingWidgetId.value = ''
  customWidgetName.value = ''
  customWidgetSize.value = '2x2'
  customWidgetCode.value = ''
  customWidgetPage.value = 0
}

const startEditCustomWidget = (widget) => {
  editingWidgetId.value = widget.id
  customWidgetName.value = widget.name || ''
  customWidgetSize.value = widget.size || '2x2'
  customWidgetCode.value = widget.code || ''

  const pageIndex = homeWidgetPages.value.findIndex((page) => page.includes(widget.id))
  customWidgetPage.value = pageIndex >= 0 ? pageIndex : 0
}

const submitCustomWidget = () => {
  const code = customWidgetCode.value.trim()
  if (!code) {
    setImportFeedback('error', t('请先填写 Widget 代码。', 'Please enter widget code first.'))
    return
  }

  const payload = {
    name: customWidgetName.value.trim() || t('自定义组件', 'Custom Widget'),
    size: customWidgetSize.value,
    code,
  }

  if (editingWidgetId.value) {
    const ok = systemStore.updateCustomWidget(editingWidgetId.value, payload)
    if (ok) {
      systemStore.placeCustomWidget(editingWidgetId.value, customWidgetPage.value)
      triggerSaved()
      resetCustomWidgetForm()
    }
    return
  }

  systemStore.addCustomWidget({
    ...payload,
    pageIndex: customWidgetPage.value,
  })
  triggerSaved()
  resetCustomWidgetForm()
}

const removeCustomWidget = (widgetId) => {
  const ok = window.confirm(t('确认删除这个自定义 Widget 吗？', 'Delete this custom widget?'))
  if (!ok) return

  systemStore.removeCustomWidget(widgetId)
  if (editingWidgetId.value === widgetId) {
    resetCustomWidgetForm()
  }
  triggerSaved()
}

const moveCustomWidgetToPage = (widgetId, pageIndex) => {
  systemStore.placeCustomWidget(widgetId, pageIndex)
  triggerSaved()
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
  if (code === 'PAYLOAD_TOO_LARGE') {
    return t(
      `导入内容过大，最多 ${error?.max || '-'} 字符。`,
      `Payload is too large. Max ${error?.max || '-'} chars.`,
    )
  }
  if (code === 'BATCH_TOO_LARGE') {
    return t(
      `单次最多导入 ${error?.max || '-'} 个组件。`,
      `Import supports up to ${error?.max || '-'} widgets per batch.`,
    )
  }
  if (code === 'ITEM_NOT_OBJECT') return `${itemPrefix}${t('必须是对象。', 'must be an object.')}`
  if (code === 'NAME_TOO_LONG') {
    return `${itemPrefix}${t(
      `名称过长（最多 ${error?.max || '-'} 字符）。`,
      `name is too long (max ${error?.max || '-'} chars).`,
    )}`
  }
  if (code === 'INVALID_SIZE') {
    return `${itemPrefix}${t(
      `尺寸无效，仅支持 ${VALID_WIDGET_SIZES.join('/')}。`,
      `invalid size. Allowed: ${VALID_WIDGET_SIZES.join('/')}.`,
    )}`
  }
  if (code === 'EMPTY_CODE') return `${itemPrefix}${t('code 不能为空。', 'code cannot be empty.')}`
  if (code === 'CODE_TOO_LONG') {
    return `${itemPrefix}${t(
      `code 过长（最多 ${error?.max || '-'} 字符）。`,
      `code is too long (max ${error?.max || '-'} chars).`,
    )}`
  }
  if (code === 'DANGEROUS_CODE') {
    return `${itemPrefix}${t(
      `包含不安全代码模式（${error?.pattern || 'unknown'}）。`,
      `contains unsafe code pattern (${error?.pattern || 'unknown'}).`,
    )}`
  }
  if (code === 'ROLLBACK_FAILED') {
    return t('导入失败，已触发回滚保护。', 'Import failed and rollback protection was triggered.')
  }
  return t('导入失败：未知错误。', 'Import failed: unknown error.')
}

const formatImportWarning = (warning) => {
  const code = warning?.code || 'UNKNOWN'
  const itemNumber = Number.isInteger(warning?.index) && warning.index >= 0 ? warning.index + 1 : 0
  const itemPrefix = itemNumber > 0 ? `${t('第', 'Item ')}${itemNumber}${t('条', '')} ` : ''

  if (code === 'IGNORED_FIELDS') {
    const fields = Array.isArray(warning?.fields) ? warning.fields.join(', ') : ''
    return `${itemPrefix}${t(
      `已忽略不识别字段：${fields || '-'}`,
      `Ignored unsupported fields: ${fields || '-'}`,
    )}`
  }
  return `${itemPrefix}${t('有未处理的告警。', 'There are unresolved warnings.')}`
}

const importCustomWidgets = () => {
  const raw = importJsonText.value.trim()
  clearImportFeedback()
  if (!raw) {
    setImportFeedback('error', t('请先粘贴 JSON。', 'Please paste JSON first.'))
    return
  }

  const result = systemStore.importCustomWidgets(raw, importTargetPage.value)
  if (!result?.ok) {
    const details = (result?.errors || []).map((item) => formatImportError(item))
    setImportFeedback('error', details[0] || t('导入失败。', 'Import failed.'), details)
    return
  }

  const warningCount = Array.isArray(result.warnings) ? result.warnings.length : 0
  const message =
    warningCount > 0
      ? t(
          `成功导入 ${result.importedCount} 个组件，含 ${warningCount} 条提醒。`,
          `Imported ${result.importedCount} widgets with ${warningCount} warnings.`,
        )
      : t(
          `成功导入 ${result.importedCount} 个组件。`,
          `Imported ${result.importedCount} widgets successfully.`,
        )
  const details = (result.warnings || []).map((item) => formatImportWarning(item))
  setImportFeedback(warningCount > 0 ? 'warning' : 'success', message, details)
  importJsonText.value = ''
  triggerSaved()
}

const fillRecognizedImportTemplate = () => {
  clearImportFeedback()
  importJsonText.value = RECOGNIZED_IMPORT_TEMPLATE_JSON.value
}

const restoreBuiltInWidget = (tileId) => {
  const ok = systemStore.placeBuiltInWidgetTile(tileId, builtInWidgetPage.value)
  if (!ok) {
    setImportFeedback('error', t('恢复失败：组件 ID 无效。', 'Restore failed: invalid widget ID.'))
    return
  }
  setImportFeedback('success', t('组件已恢复到目标屏幕。', 'Widget restored to target screen.'))
  triggerSaved()
}

const widgetPageLabel = (widgetId) => {
  const pageIndex = homeWidgetPages.value.findIndex((page) => page.includes(widgetId))
  return pageIndex >= 0 ? pageDisplayLabel(pageIndex) : t('未放入主屏', 'Not placed on Home')
}

onBeforeUnmount(() => {
  if (savedTimerId) clearTimeout(savedTimerId)
  if (copiedTimerId) clearTimeout(copiedTimerId)
})
</script>

<template>
  <div class="w-full h-full bg-gray-100 flex flex-col text-black">
    <div class="pt-12 pb-3 px-4 bg-white/80 backdrop-blur sticky top-0 z-10 border-b border-gray-200 flex items-center">
      <button @click="handleBack" class="mr-2 text-blue-500 flex items-center gap-1 text-sm font-medium">
        <i class="fas fa-chevron-left"></i> {{ backLabel }}
      </button>
      <h1 class="text-2xl font-bold flex-1">{{ pageTitle }}</h1>
      <button @click="goHome" class="text-blue-500 text-sm">{{ t('主页', 'Home') }}</button>
    </div>

    <div v-if="activeMenu === ROOT_MENU" class="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar">
      <button
        class="w-full bg-white rounded-xl p-4 shadow-sm text-left flex items-center gap-3"
        @click="openMenu('theme')"
      >
        <div class="w-8 h-8 rounded-lg bg-violet-500 text-white flex items-center justify-center text-xs">
          <i class="fas fa-palette"></i>
        </div>
        <div class="flex-1">
          <p class="text-sm font-semibold">{{ t('整体主题美化', 'Theme Styling') }}</p>
          <p class="text-[11px] text-gray-500">{{ t('主题、壁纸与自定义 CSS', 'Theme, wallpaper and custom CSS') }}</p>
        </div>
        <i class="fas fa-chevron-right text-xs text-gray-300"></i>
      </button>

      <button
        class="w-full bg-white rounded-xl p-4 shadow-sm text-left flex items-center gap-3"
        @click="openMenu('font')"
      >
        <div class="w-8 h-8 rounded-lg bg-slate-700 text-white flex items-center justify-center text-xs">
          <i class="fas fa-font"></i>
        </div>
        <div class="flex-1">
          <p class="text-sm font-semibold">{{ t('字体', 'Font') }}</p>
          <p class="text-[11px] text-gray-500">{{ t('全局字体族与自定义字体栈', 'Global font family and custom stack') }}</p>
        </div>
        <i class="fas fa-chevron-right text-xs text-gray-300"></i>
      </button>

      <button
        class="w-full bg-white rounded-xl p-4 shadow-sm text-left flex items-center gap-3"
        @click="openMenu('widget')"
      >
        <div class="w-8 h-8 rounded-lg bg-blue-500 text-white flex items-center justify-center text-xs">
          <i class="fas fa-puzzle-piece"></i>
        </div>
        <div class="flex-1">
          <p class="text-sm font-semibold">{{ t('Widget', 'Widget') }}</p>
          <p class="text-[11px] text-gray-500">{{ t('创建、导入、模板导出与管理', 'Create, import, export template, and manage') }}</p>
        </div>
        <i class="fas fa-chevron-right text-xs text-gray-300"></i>
      </button>
    </div>

    <div v-else-if="activeMenu === 'theme'" class="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
      <div class="bg-white rounded-xl p-4 shadow-sm">
        <div class="text-sm font-bold mb-3">{{ t('主题（保留 Y2K / 纯白）', 'Theme (Y2K / Pure White)') }}</div>
        <div class="grid grid-cols-2 gap-3">
          <button
            v-for="theme in availableThemes"
            :key="theme.id"
            @click="setTheme(theme.id)"
            class="h-24 rounded-lg border-2 flex items-center justify-center cursor-pointer"
            :class="settings.appearance.currentTheme === theme.id ? 'border-blue-500' : 'border-transparent'"
            :style="{ background: theme.preview }"
          >
            <span class="text-xs font-bold" :class="theme.darkText ? 'text-black' : 'text-white'">
              {{ themeDisplayName(theme) }}
            </span>
          </button>
        </div>
      </div>

      <div class="bg-white rounded-xl p-4 shadow-sm">
        <label class="text-xs text-gray-500 block mb-1">{{ t('壁纸 URL', 'Wallpaper URL') }}</label>
        <input
          v-model="settings.appearance.wallpaper"
          type="text"
          class="w-full border-b border-gray-200 py-1 outline-none text-sm"
          placeholder="https://..."
        />
      </div>

      <div class="bg-white rounded-xl p-4 shadow-sm">
        <label class="text-xs text-gray-500 block mb-1">{{ t('锁屏时间样式', 'Lock Clock Style') }}</label>
        <select
          v-model="settings.appearance.lockClockStyle"
          class="w-full border rounded-md px-2 py-2 text-sm outline-none bg-white"
          @change="saveAppearance"
        >
          <option v-for="style in LOCK_CLOCK_STYLE_OPTIONS" :key="style.id" :value="style.id">
            {{ lockClockStyleLabel(style.id) }}
          </option>
        </select>
      </div>

      <div class="bg-white rounded-xl p-4 shadow-sm">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-semibold">{{ t('顶部状态栏', 'Status Bar') }}</p>
            <p class="text-[11px] text-gray-500">{{ t('显示时间与信号图标', 'Show time and signal icons') }}</p>
          </div>
          <button
            type="button"
            class="relative w-12 h-7 rounded-full transition"
            :class="settings.appearance.showStatusBar !== false ? 'bg-blue-500' : 'bg-gray-300'"
            @click="toggleStatusBar"
          >
            <span
              class="absolute top-1 w-5 h-5 rounded-full bg-white transition"
              :class="settings.appearance.showStatusBar !== false ? 'left-6' : 'left-1'"
            ></span>
          </button>
        </div>
      </div>

      <div class="bg-white rounded-xl p-4 shadow-sm">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-semibold">{{ t('触感反馈（振动）', 'Haptic Feedback (Vibration)') }}</p>
            <p class="text-[11px] text-gray-500">{{ t('拖拽落位与点击时短震动（设备支持时）', 'Short vibration on drag/drop and tap (if supported)') }}</p>
          </div>
          <button
            type="button"
            class="relative w-12 h-7 rounded-full transition"
            :class="settings.appearance.hapticFeedbackEnabled !== false ? 'bg-blue-500' : 'bg-gray-300'"
            @click="toggleHapticFeedback"
          >
            <span
              class="absolute top-1 w-5 h-5 rounded-full bg-white transition"
              :class="settings.appearance.hapticFeedbackEnabled !== false ? 'left-6' : 'left-1'"
            ></span>
          </button>
        </div>
      </div>

      <div class="bg-white rounded-xl p-4 shadow-sm">
        <div class="flex items-center justify-between mb-2">
          <label class="text-xs text-gray-500 block">{{ t('自定义 CSS（高级）', 'Custom CSS (Advanced)') }}</label>
          <button class="text-[11px] text-blue-500" @click="clearCustomCss">{{ t('清空', 'Clear') }}</button>
        </div>
        <textarea
          v-model="settings.appearance.customCss"
          class="w-full h-36 border border-gray-200 rounded-md p-2 text-xs font-mono outline-none resize-none"
          placeholder=".app-shell { --home-widget-bg: rgba(255,255,255,0.5); }"
        ></textarea>
      </div>

      <button
        @click="saveAppearance"
        class="w-full py-3 rounded-xl text-sm font-semibold transition"
        :class="saved ? 'bg-green-500 text-white' : 'bg-blue-500 text-white hover:bg-blue-600'"
      >
        {{ saved ? t('已保存', 'Saved') : t('保存主题设置', 'Save theme settings') }}
      </button>
    </div>

    <div v-else-if="activeMenu === 'font'" class="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
      <div class="bg-white rounded-xl p-4 shadow-sm">
        <p class="text-sm font-bold mb-3">{{ t('字体预设', 'Font Presets') }}</p>
        <div class="grid grid-cols-2 gap-2">
          <button
            v-for="preset in FONT_PRESETS"
            :key="preset.id"
            @click="setFontPreset(preset.value)"
            class="px-3 py-2 rounded-lg text-sm border transition text-left"
            :class="currentFontStack === preset.value ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-gray-200 hover:bg-gray-50'"
          >
            {{ fontPresetLabel(preset) }}
          </button>
        </div>
      </div>

      <div class="bg-white rounded-xl p-4 shadow-sm">
        <label class="text-xs text-gray-500 block mb-1">{{ t('自定义字体栈（CSS font-family）', 'Custom font stack (CSS font-family)') }}</label>
        <input
          v-model="customFontStackInput"
          type="text"
          class="w-full border-b border-gray-200 py-1 outline-none text-sm font-mono"
          placeholder='"Inter", "Noto Sans SC", sans-serif'
        />
        <div class="mt-3 flex gap-2">
          <button
            @click="applyCustomFontStack"
            class="flex-1 px-3 py-2 rounded-md text-sm font-semibold bg-blue-500 text-white hover:bg-blue-600 transition"
          >
            {{ t('应用字体', 'Apply Font') }}
          </button>
          <button
            @click="resetFontStack"
            class="px-3 py-2 rounded-md text-sm border border-gray-200 hover:bg-gray-50"
          >
            {{ t('重置', 'Reset') }}
          </button>
        </div>
      </div>

      <div class="bg-white rounded-xl p-4 shadow-sm">
        <p class="text-xs text-gray-500 mb-1">{{ t('当前字体栈', 'Current font stack') }}</p>
        <p class="text-xs font-mono text-gray-700 break-all">{{ currentFontStack }}</p>
      </div>

      <button
        @click="saveAppearance"
        class="w-full py-3 rounded-xl text-sm font-semibold transition"
        :class="saved ? 'bg-green-500 text-white' : 'bg-blue-500 text-white hover:bg-blue-600'"
      >
        {{ saved ? t('已保存', 'Saved') : t('保存字体设置', 'Save font settings') }}
      </button>
    </div>

    <div v-else-if="activeMenu === 'widget'" class="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
      <div class="bg-white rounded-xl p-4 shadow-sm">
        <div class="flex items-center justify-between mb-2">
          <p class="text-sm font-bold">{{ t('通用模板（可导出文本）', 'General template (exportable)') }}</p>
          <span class="text-[11px] text-gray-500">{{ t('用于自定义创作', 'For custom creation') }}</span>
        </div>
        <textarea
          :value="WIDGET_TEMPLATE_JSON"
          readonly
          class="w-full h-36 border border-gray-200 rounded-md p-2 text-xs font-mono outline-none resize-none bg-gray-50"
        ></textarea>
        <div class="mt-2 flex gap-2">
          <button
            @click="copyWidgetTemplate"
            class="flex-1 px-3 py-2 rounded-md text-xs font-semibold transition"
            :class="templateCopied ? 'bg-green-500 text-white' : 'bg-blue-500 text-white hover:bg-blue-600'"
          >
            {{ templateCopied ? t('已复制', 'Copied') : t('复制模板', 'Copy Template') }}
          </button>
          <button
            @click="exportWidgetTemplate"
            class="flex-1 px-3 py-2 rounded-md text-xs font-semibold bg-gray-800 text-white hover:bg-black transition"
          >
            {{ t('导出 TXT', 'Export TXT') }}
          </button>
        </div>
      </div>

      <div class="bg-white rounded-xl p-4 shadow-sm">
        <div class="flex items-center justify-between mb-2">
          <p class="text-sm font-bold">{{ t('内置 Widget 恢复', 'Built-in Widget Restore') }}</p>
          <span class="text-[11px] text-gray-500">{{ t('可单项加回，不用整屏重置', 'Restore single widget without full reset') }}</span>
        </div>
        <div class="flex items-center gap-2 mb-2">
          <label class="text-xs text-gray-500">{{ t('放置到', 'Place to') }}</label>
          <select v-model.number="builtInWidgetPage" class="border rounded-md px-2 py-1.5 text-xs outline-none bg-white">
            <option v-for="pageIndex in pageOptions" :key="`builtin-${pageIndex}`" :value="pageIndex">
              {{ pageDisplayLabel(pageIndex) }}
            </option>
          </select>
        </div>

        <div class="space-y-2">
          <div
            v-for="widget in builtInWidgetStates"
            :key="widget.id"
            class="border border-gray-200 rounded-lg p-2.5 flex items-center gap-2"
          >
            <div class="flex-1 min-w-0">
              <p class="text-sm font-semibold">{{ widget.label }}</p>
              <p class="text-[11px] text-gray-500">{{ widget.pageLabel }}</p>
            </div>
            <button
              @click="restoreBuiltInWidget(widget.id)"
              class="px-2.5 py-1.5 rounded-md text-[11px] font-semibold bg-blue-500 text-white hover:bg-blue-600 transition"
            >
              {{ widget.visible ? `${t('移动到', 'Move to')} ${pageDisplayLabel(builtInWidgetPage)}` : `${t('加回到', 'Restore to')} ${pageDisplayLabel(builtInWidgetPage)}` }}
            </button>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-xl p-4 shadow-sm">
        <div class="flex items-center justify-between mb-3">
          <p class="text-sm font-bold">{{ t('自定义 Widget', 'Custom Widget') }}</p>
          <span class="text-[11px] text-gray-500">{{ t('支持粘贴代码与导入 JSON', 'Support code paste and JSON import') }}</span>
        </div>

        <div class="space-y-3">
          <div>
            <label class="text-xs text-gray-500 block mb-1">{{ t('名称', 'Name') }}</label>
            <input
              v-model="customWidgetName"
              type="text"
              class="w-full border rounded-md px-2 py-2 text-sm outline-none"
              :placeholder="t('例如：打卡组件 / 时间胶囊', 'Example: check-in widget / time capsule')"
            />
          </div>

          <div class="grid grid-cols-2 gap-2">
            <div>
              <label class="text-xs text-gray-500 block mb-1">{{ t('尺寸', 'Size') }}</label>
              <select v-model="customWidgetSize" class="w-full border rounded-md px-2 py-2 text-sm outline-none bg-white">
                <option v-for="size in CUSTOM_SIZE_OPTIONS" :key="size" :value="size">{{ size }}</option>
              </select>
            </div>
            <div>
              <label class="text-xs text-gray-500 block mb-1">{{ t('放置到', 'Place to') }}</label>
              <select v-model.number="customWidgetPage" class="w-full border rounded-md px-2 py-2 text-sm outline-none bg-white">
                <option v-for="pageIndex in pageOptions" :key="`create-${pageIndex}`" :value="pageIndex">
                  {{ pageDisplayLabel(pageIndex) }}
                </option>
              </select>
            </div>
          </div>

          <div>
            <label class="text-xs text-gray-500 block mb-1">{{ t('Widget 代码（HTML/CSS/JS）', 'Widget Code (HTML/CSS/JS)') }}</label>
            <textarea
              v-model="customWidgetCode"
              class="w-full h-36 border border-gray-200 rounded-md p-2 text-xs font-mono outline-none resize-none"
              placeholder="<div style='height:100%;display:flex;align-items:center;justify-content:center;'>Hello Widget</div>"
            ></textarea>
          </div>

          <div class="flex gap-2">
            <button
              @click="submitCustomWidget"
              class="flex-1 px-3 py-2 rounded-md text-sm font-semibold text-white bg-blue-500 hover:bg-blue-600 transition"
            >
              {{ editingWidgetId ? t('更新 Widget', 'Update Widget') : t('添加 Widget', 'Add Widget') }}
            </button>
            <button
              v-if="editingWidgetId"
              @click="resetCustomWidgetForm"
              class="px-3 py-2 rounded-md text-sm border border-gray-200 hover:bg-gray-50"
            >
              {{ t('取消编辑', 'Cancel Edit') }}
            </button>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-xl p-4 shadow-sm">
        <div class="flex items-center justify-between gap-2 mb-1">
          <label class="text-xs text-gray-500 block">{{ t('导入 Widgets（JSON 数组）', 'Import Widgets (JSON Array)') }}</label>
          <button
            @click="fillRecognizedImportTemplate"
            class="px-2.5 py-1 rounded-md text-[11px] border border-gray-200 hover:bg-gray-50"
          >
            {{ t('填入识别模板', 'Fill recognized template') }}
          </button>
        </div>
        <p class="text-[11px] text-gray-500 mb-2">
          {{ t('仅识别数组项中的 name / size / code 字段。', 'Only name / size / code are recognized in each array item.') }}
        </p>
        <textarea
          v-model="importJsonText"
          class="w-full h-24 border border-gray-200 rounded-md p-2 text-xs font-mono outline-none resize-none"
          :placeholder="importJsonPlaceholder"
        ></textarea>
        <div class="flex items-center gap-2 mt-2">
          <select v-model.number="importTargetPage" class="border rounded-md px-2 py-1.5 text-xs outline-none bg-white">
            <option v-for="pageIndex in pageOptions" :key="`import-${pageIndex}`" :value="pageIndex">
              {{ t('导入到', 'Import to') }} {{ pageDisplayLabel(pageIndex) }}
            </option>
          </select>
          <button
            @click="importCustomWidgets"
            class="px-3 py-1.5 rounded-md text-xs bg-gray-800 text-white hover:bg-black transition"
          >
            {{ t('导入 JSON', 'Import JSON') }}
          </button>
        </div>
        <div class="mt-2 rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-2 text-[11px] text-gray-600 space-y-1">
          <p>{{ t('识别规则', 'Recognition Rules') }}</p>
          <p>{{ t('1. 顶层必须是 JSON 数组。', '1. Top-level must be a JSON array.') }}</p>
          <p>{{ t('2. 每项必须包含 code，size 仅支持 1x1/2x1/2x2/4x2/4x3。', '2. Each item must include code; size supports only 1x1/2x1/2x2/4x2/4x3.') }}</p>
          <p>{{ t('3. name 可选，不填时会自动使用“自定义组件”。', '3. name is optional; fallback name will be applied automatically.') }}</p>
        </div>
        <div
          v-if="importFeedbackMessage"
          class="mt-2 rounded-lg border px-2.5 py-2 text-[11px] space-y-1"
          :class="
            importFeedbackType === 'error'
              ? 'border-red-200 bg-red-50 text-red-700'
              : importFeedbackType === 'warning'
                ? 'border-amber-200 bg-amber-50 text-amber-700'
                : 'border-emerald-200 bg-emerald-50 text-emerald-700'
          "
        >
          <p class="font-semibold">{{ importFeedbackMessage }}</p>
          <p v-for="(detail, idx) in importFeedbackDetails" :key="`import-feedback-${idx}`">
            {{ detail }}
          </p>
        </div>
      </div>

      <div class="bg-white rounded-xl p-4 shadow-sm" v-if="customWidgets.length > 0">
        <p class="text-sm font-bold mb-2">{{ t('已创建 Widget', 'Created Widgets') }}</p>
        <div class="space-y-2">
          <div v-for="widget in customWidgets" :key="widget.id" class="rounded-lg border border-gray-200 p-2.5">
            <div class="flex items-center justify-between gap-2 mb-2">
              <div>
                <p class="text-sm font-semibold">{{ widget.name }}</p>
                <p class="text-[11px] text-gray-500">{{ t('尺寸', 'Size') }} {{ widget.size }} · {{ widgetPageLabel(widget.id) }}</p>
              </div>
              <div class="flex gap-1.5">
                <button @click="startEditCustomWidget(widget)" class="px-2 py-1 text-[11px] rounded border border-gray-200 hover:bg-gray-50">
                  {{ t('编辑', 'Edit') }}
                </button>
                <button @click="removeCustomWidget(widget.id)" class="px-2 py-1 text-[11px] rounded border border-red-200 text-red-600 hover:bg-red-50">
                  {{ t('删除', 'Delete') }}
                </button>
              </div>
            </div>
            <div class="flex flex-wrap gap-1.5">
              <button
                v-for="pageIndex in pageOptions"
                :key="`${widget.id}-${pageIndex}`"
                @click="moveCustomWidgetToPage(widget.id, pageIndex)"
                class="px-2 py-1 text-[11px] rounded border border-gray-200 hover:bg-gray-50"
              >
                {{ t('放到', 'Move to') }} {{ pageDisplayLabel(pageIndex) }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <button
        @click="saveAppearance"
        class="w-full py-3 rounded-xl text-sm font-semibold transition"
        :class="saved ? 'bg-green-500 text-white' : 'bg-blue-500 text-white hover:bg-blue-600'"
      >
        {{ saved ? t('已保存', 'Saved') : t('保存 Widget 设置', 'Save widget settings') }}
      </button>
    </div>
  </div>
</template>
