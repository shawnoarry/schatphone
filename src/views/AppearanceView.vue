<script setup>
import { computed, onBeforeUnmount, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import { useSystemStore } from '../stores/system'

const CUSTOM_SIZE_OPTIONS = ['1x1', '2x1', '2x2', '4x2', '4x3']

const router = useRouter()
const systemStore = useSystemStore()

const { settings, availableThemes } = storeToRefs(systemStore)
const saved = ref(false)
let savedTimerId = null

const customWidgetName = ref('')
const customWidgetSize = ref('2x2')
const customWidgetCode = ref('')
const customWidgetPage = ref(0)
const editingWidgetId = ref('')

const importJsonText = ref('')
const importTargetPage = ref(0)

const customWidgets = computed(() => settings.value.appearance.customWidgets || [])
const homeWidgetPages = computed(() => settings.value.appearance.homeWidgetPages || [])
const pageOptions = computed(() =>
  Array.from({ length: Math.max(homeWidgetPages.value.length, 5) }, (_, index) => index),
)

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

const setTheme = (themeId) => {
  systemStore.setTheme(themeId)
}

const clearCustomCss = () => {
  settings.value.appearance.customCss = ''
}

const saveAppearance = () => {
  triggerSaved()
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

const widgetPageLabel = (widgetId) => {
  const pageIndex = homeWidgetPages.value.findIndex((page) => page.includes(widgetId))
  return pageIndex >= 0 ? `第${pageIndex + 1}屏` : '未放入主屏'
}

onBeforeUnmount(() => {
  if (savedTimerId) clearTimeout(savedTimerId)
})
</script>

<template>
  <div class="w-full h-full bg-gray-100 flex flex-col text-black">
    <div class="pt-12 pb-3 px-4 bg-white/80 backdrop-blur sticky top-0 z-10 border-b border-gray-200 flex items-center">
      <button @click="goSettings" class="mr-2 text-blue-500 flex items-center gap-1 text-sm font-medium">
        <i class="fas fa-chevron-left"></i> 设置
      </button>
      <h1 class="text-2xl font-bold flex-1">外观工坊</h1>
      <button @click="goHome" class="text-blue-500 text-sm">主页</button>
    </div>

    <div class="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
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
        <p class="text-[10px] text-gray-400 mt-2">
          建议优先覆盖 CSS 变量：<code>--home-widget-bg</code>、<code>--home-dock-bg</code>、<code>--home-icon-default-bg</code>
        </p>
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
        {{ saved ? '已保存' : '保存外观设置' }}
      </button>
    </div>
  </div>
</template>
