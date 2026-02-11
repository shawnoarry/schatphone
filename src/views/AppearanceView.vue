<script setup>
import { computed, onBeforeUnmount, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import { useSystemStore } from '../stores/system'

const CUSTOM_SIZE_OPTIONS = ['1x1', '2x1', '2x2', '4x2', '4x3']
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

const WIDGET_TEMPLATE_JSON = JSON.stringify(
  [
    {
      name: '我的组件',
      size: '2x2',
      code: WIDGET_TEMPLATE_CODE,
    },
  ],
  null,
  2,
)

const router = useRouter()
const systemStore = useSystemStore()

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
const builtInWidgetPage = ref(0)
const customFontStackInput = ref('')

const customWidgets = computed(() => settings.value.appearance.customWidgets || [])
const homeWidgetPages = computed(() => settings.value.appearance.homeWidgetPages || [])
const pageOptions = computed(() =>
  Array.from({ length: Math.max(homeWidgetPages.value.length, 5) }, (_, index) => index),
)
const builtInWidgetStates = computed(() =>
  BUILT_IN_WIDGET_OPTIONS.map((item) => {
    const pageIndex = homeWidgetPages.value.findIndex((page) => page.includes(item.id))
    return {
      ...item,
      pageIndex,
      visible: pageIndex >= 0,
      pageLabel: pageIndex >= 0 ? `第${pageIndex + 1}屏` : '已隐藏',
    }
  }),
)

const pageTitle = computed(() => {
  if (activeMenu.value === 'theme') return '主题美化'
  if (activeMenu.value === 'font') return '字体设置'
  if (activeMenu.value === 'widget') return 'Widget 工坊'
  return '外观工坊'
})

const backLabel = computed(() => (activeMenu.value === ROOT_MENU ? '设置' : '外观工坊'))

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
      await navigator.clipboard.writeText(WIDGET_TEMPLATE_JSON)
    } else {
      const temp = document.createElement('textarea')
      temp.value = WIDGET_TEMPLATE_JSON
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
    alert('复制失败，请手动复制模板文本。')
  }
}

const exportWidgetTemplate = () => {
  const content = `# SchatPhone Widget JSON Template\n\n${WIDGET_TEMPLATE_JSON}\n`
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = 'schatphone-widget-template.txt'
  anchor.click()
  URL.revokeObjectURL(url)
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
    alert('请先填写 Widget 代码。')
    return
  }

  const payload = {
    name: customWidgetName.value.trim() || '自定义组件',
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
  const ok = window.confirm('确认删除这个自定义 Widget 吗？')
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

const importCustomWidgets = () => {
  const raw = importJsonText.value.trim()
  if (!raw) {
    alert('请先粘贴 JSON。')
    return
  }

  const importedCount = systemStore.importCustomWidgets(raw, importTargetPage.value)
  if (importedCount <= 0) {
    alert('导入失败：请检查 JSON 格式。')
    return
  }

  importJsonText.value = ''
  triggerSaved()
}

const restoreBuiltInWidget = (tileId) => {
  const ok = systemStore.placeBuiltInWidgetTile(tileId, builtInWidgetPage.value)
  if (!ok) {
    alert('恢复失败：组件 ID 无效。')
    return
  }
  triggerSaved()
}

const widgetPageLabel = (widgetId) => {
  const pageIndex = homeWidgetPages.value.findIndex((page) => page.includes(widgetId))
  return pageIndex >= 0 ? `第${pageIndex + 1}屏` : '未放入主屏'
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
      <button @click="goHome" class="text-blue-500 text-sm">主页</button>
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
          <p class="text-sm font-semibold">整体主题美化</p>
          <p class="text-[11px] text-gray-500">主题、壁纸与自定义 CSS</p>
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
          <p class="text-sm font-semibold">字体</p>
          <p class="text-[11px] text-gray-500">全局字体族与自定义字体栈</p>
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
          <p class="text-sm font-semibold">Widget</p>
          <p class="text-[11px] text-gray-500">创建、导入、模板导出与管理</p>
        </div>
        <i class="fas fa-chevron-right text-xs text-gray-300"></i>
      </button>
    </div>

    <div v-else-if="activeMenu === 'theme'" class="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
      <div class="bg-white rounded-xl p-4 shadow-sm">
        <div class="text-sm font-bold mb-3">主题（保留 Y2K / 纯白）</div>
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
              {{ theme.name }}
            </span>
          </button>
        </div>
      </div>

      <div class="bg-white rounded-xl p-4 shadow-sm">
        <label class="text-xs text-gray-500 block mb-1">壁纸 URL</label>
        <input
          v-model="settings.appearance.wallpaper"
          type="text"
          class="w-full border-b border-gray-200 py-1 outline-none text-sm"
          placeholder="https://..."
        />
      </div>

      <div class="bg-white rounded-xl p-4 shadow-sm">
        <div class="flex items-center justify-between mb-2">
          <label class="text-xs text-gray-500 block">自定义 CSS（高级）</label>
          <button class="text-[11px] text-blue-500" @click="clearCustomCss">清空</button>
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
        {{ saved ? '已保存' : '保存主题设置' }}
      </button>
    </div>

    <div v-else-if="activeMenu === 'font'" class="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
      <div class="bg-white rounded-xl p-4 shadow-sm">
        <p class="text-sm font-bold mb-3">字体预设</p>
        <div class="grid grid-cols-2 gap-2">
          <button
            v-for="preset in FONT_PRESETS"
            :key="preset.id"
            @click="setFontPreset(preset.value)"
            class="px-3 py-2 rounded-lg text-sm border transition text-left"
            :class="currentFontStack === preset.value ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-gray-200 hover:bg-gray-50'"
          >
            {{ preset.label }}
          </button>
        </div>
      </div>

      <div class="bg-white rounded-xl p-4 shadow-sm">
        <label class="text-xs text-gray-500 block mb-1">自定义字体栈（CSS font-family）</label>
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
            应用字体
          </button>
          <button
            @click="resetFontStack"
            class="px-3 py-2 rounded-md text-sm border border-gray-200 hover:bg-gray-50"
          >
            重置
          </button>
        </div>
      </div>

      <div class="bg-white rounded-xl p-4 shadow-sm">
        <p class="text-xs text-gray-500 mb-1">当前字体栈</p>
        <p class="text-xs font-mono text-gray-700 break-all">{{ currentFontStack }}</p>
      </div>

      <button
        @click="saveAppearance"
        class="w-full py-3 rounded-xl text-sm font-semibold transition"
        :class="saved ? 'bg-green-500 text-white' : 'bg-blue-500 text-white hover:bg-blue-600'"
      >
        {{ saved ? '已保存' : '保存字体设置' }}
      </button>
    </div>

    <div v-else-if="activeMenu === 'widget'" class="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
      <div class="bg-white rounded-xl p-4 shadow-sm">
        <div class="flex items-center justify-between mb-2">
          <p class="text-sm font-bold">通用模板（可导出文本）</p>
          <span class="text-[11px] text-gray-500">用于自定义创作</span>
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
            {{ templateCopied ? '已复制' : '复制模板' }}
          </button>
          <button
            @click="exportWidgetTemplate"
            class="flex-1 px-3 py-2 rounded-md text-xs font-semibold bg-gray-800 text-white hover:bg-black transition"
          >
            导出 TXT
          </button>
        </div>
      </div>

      <div class="bg-white rounded-xl p-4 shadow-sm">
        <div class="flex items-center justify-between mb-2">
          <p class="text-sm font-bold">内置 Widget 恢复</p>
          <span class="text-[11px] text-gray-500">可单项加回，不用整屏重置</span>
        </div>
        <div class="flex items-center gap-2 mb-2">
          <label class="text-xs text-gray-500">放置到</label>
          <select v-model.number="builtInWidgetPage" class="border rounded-md px-2 py-1.5 text-xs outline-none bg-white">
            <option v-for="pageIndex in pageOptions" :key="`builtin-${pageIndex}`" :value="pageIndex">
              第{{ pageIndex + 1 }}屏
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
              {{ widget.visible ? `移动到第${builtInWidgetPage + 1}屏` : `加回到第${builtInWidgetPage + 1}屏` }}
            </button>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-xl p-4 shadow-sm">
        <div class="flex items-center justify-between mb-3">
          <p class="text-sm font-bold">自定义 Widget</p>
          <span class="text-[11px] text-gray-500">支持粘贴代码与导入 JSON</span>
        </div>

        <div class="space-y-3">
          <div>
            <label class="text-xs text-gray-500 block mb-1">名称</label>
            <input
              v-model="customWidgetName"
              type="text"
              class="w-full border rounded-md px-2 py-2 text-sm outline-none"
              placeholder="例如：打卡组件 / 时间胶囊"
            />
          </div>

          <div class="grid grid-cols-2 gap-2">
            <div>
              <label class="text-xs text-gray-500 block mb-1">尺寸</label>
              <select v-model="customWidgetSize" class="w-full border rounded-md px-2 py-2 text-sm outline-none bg-white">
                <option v-for="size in CUSTOM_SIZE_OPTIONS" :key="size" :value="size">{{ size }}</option>
              </select>
            </div>
            <div>
              <label class="text-xs text-gray-500 block mb-1">放置到</label>
              <select v-model.number="customWidgetPage" class="w-full border rounded-md px-2 py-2 text-sm outline-none bg-white">
                <option v-for="pageIndex in pageOptions" :key="`create-${pageIndex}`" :value="pageIndex">
                  第{{ pageIndex + 1 }}屏
                </option>
              </select>
            </div>
          </div>

          <div>
            <label class="text-xs text-gray-500 block mb-1">Widget 代码（HTML/CSS/JS）</label>
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
              {{ editingWidgetId ? '更新 Widget' : '添加 Widget' }}
            </button>
            <button
              v-if="editingWidgetId"
              @click="resetCustomWidgetForm"
              class="px-3 py-2 rounded-md text-sm border border-gray-200 hover:bg-gray-50"
            >
              取消编辑
            </button>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-xl p-4 shadow-sm">
        <label class="text-xs text-gray-500 block mb-1">导入 Widgets（JSON 数组）</label>
        <textarea
          v-model="importJsonText"
          class="w-full h-24 border border-gray-200 rounded-md p-2 text-xs font-mono outline-none resize-none"
          placeholder='[{"name":"天气卡","size":"2x2","code":"<div>...</div>"}]'
        ></textarea>
        <div class="flex items-center gap-2 mt-2">
          <select v-model.number="importTargetPage" class="border rounded-md px-2 py-1.5 text-xs outline-none bg-white">
            <option v-for="pageIndex in pageOptions" :key="`import-${pageIndex}`" :value="pageIndex">
              导入到第{{ pageIndex + 1 }}屏
            </option>
          </select>
          <button
            @click="importCustomWidgets"
            class="px-3 py-1.5 rounded-md text-xs bg-gray-800 text-white hover:bg-black transition"
          >
            导入 JSON
          </button>
        </div>
      </div>

      <div class="bg-white rounded-xl p-4 shadow-sm" v-if="customWidgets.length > 0">
        <p class="text-sm font-bold mb-2">已创建 Widget</p>
        <div class="space-y-2">
          <div v-for="widget in customWidgets" :key="widget.id" class="rounded-lg border border-gray-200 p-2.5">
            <div class="flex items-center justify-between gap-2 mb-2">
              <div>
                <p class="text-sm font-semibold">{{ widget.name }}</p>
                <p class="text-[11px] text-gray-500">尺寸 {{ widget.size }} · {{ widgetPageLabel(widget.id) }}</p>
              </div>
              <div class="flex gap-1.5">
                <button @click="startEditCustomWidget(widget)" class="px-2 py-1 text-[11px] rounded border border-gray-200 hover:bg-gray-50">
                  编辑
                </button>
                <button @click="removeCustomWidget(widget.id)" class="px-2 py-1 text-[11px] rounded border border-red-200 text-red-600 hover:bg-red-50">
                  删除
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
                放到第{{ pageIndex + 1 }}屏
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
        {{ saved ? '已保存' : '保存 Widget 设置' }}
      </button>
    </div>
  </div>
</template>
