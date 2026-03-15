<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import { useSystemStore } from '../stores/system'
import { detectApiKindFromUrl, fetchAvailableModels, formatApiErrorForUi } from '../lib/ai'
import { useI18n } from '../composables/useI18n'

const router = useRouter()
const systemStore = useSystemStore()
const { settings, apiReports } = storeToRefs(systemStore)
const { t, systemLanguage, languageBase } = useI18n()

const modelOptions = ref([])
const modelsLoading = ref(false)
const modelsError = ref('')
const presetName = ref('')
const showApiKey = ref(false)
const saved = ref(false)
const reportModuleFilter = ref('all')
const reportLevelFilter = ref('all')

let modelFetchTimerId = null
let modelFetchToken = 0
let savedTimerId = null

const ensurePresetState = () => {
  if (!Array.isArray(settings.value.api.presets)) {
    settings.value.api.presets = []
  }
  if (typeof settings.value.api.activePresetId !== 'string') {
    settings.value.api.activePresetId = ''
  }
}

const apiKindLabel = computed(() => {
  const kind = settings.value.api.resolvedKind
  if (kind === 'gemini') return 'Gemini API'
  if (kind === 'openai_compatible') return t('OpenAI 兼容', 'OpenAI-Compatible')
  return t('自动识别', 'Auto')
})

const presets = computed(() => settings.value.api.presets || [])
const reportModuleOptions = computed(() => [
  { value: 'all', label: t('全部模块', 'All modules') },
  { value: 'chat', label: t('聊天', 'Chat') },
  { value: 'network', label: t('网络', 'Network') },
  { value: 'map', label: t('地图', 'Map') },
  { value: 'shopping', label: t('购物', 'Shopping') },
])
const reportLevelOptions = computed(() => [
  { value: 'all', label: t('全部级别', 'All levels') },
  { value: 'error', label: t('错误', 'Error') },
  { value: 'info', label: t('信息', 'Info') },
])
const networkReports = computed(() => {
  const moduleFilter = reportModuleFilter.value
  const levelFilter = reportLevelFilter.value
  return (apiReports.value || [])
    .filter((item) => {
      if (!item || typeof item !== 'object') return false
      if (moduleFilter !== 'all' && item.module !== moduleFilter) return false
      if (levelFilter !== 'all' && item.level !== levelFilter) return false
      return true
    })
    .slice(0, 100)
})

const savePreset = () => {
  ensurePresetState()
  const name = presetName.value.trim()
  const url = settings.value.api.url?.trim()
  const key = settings.value.api.key?.trim()
  const model = settings.value.api.model?.trim()

  if (!name) {
    alert(t('请输入预设名称。', 'Please enter a preset name.'))
    return
  }
  if (!url || !key) {
    alert(t('请先填写 URL 和 Key。', 'Please enter URL and Key first.'))
    return
  }

  const now = Date.now()
  const existing = presets.value.find((item) => item.name === name)
  if (existing) {
    existing.url = url
    existing.key = key
    existing.model = model
    existing.updatedAt = now
    settings.value.api.activePresetId = existing.id
  } else {
    const preset = {
      id: `preset_${now}`,
      name,
      url,
      key,
      model,
      createdAt: now,
      updatedAt: now,
    }
    settings.value.api.presets.push(preset)
    settings.value.api.activePresetId = preset.id
  }

  presetName.value = ''
}

const applyPreset = (presetId) => {
  ensurePresetState()
  if (!presetId) return

  const selected = presets.value.find((item) => item.id === presetId)
  if (!selected) return

  settings.value.api.url = selected.url || ''
  settings.value.api.key = selected.key || ''
  settings.value.api.model = selected.model || settings.value.api.model
  settings.value.api.activePresetId = selected.id
}

const removeActivePreset = () => {
  ensurePresetState()
  const activeId = settings.value.api.activePresetId
  if (!activeId) return

  const index = presets.value.findIndex((item) => item.id === activeId)
  if (index < 0) return

  const ok = window.confirm(t('确认删除当前预设吗？', 'Delete current preset?'))
  if (!ok) return

  settings.value.api.presets.splice(index, 1)

  if (settings.value.api.presets.length > 0) {
    settings.value.api.activePresetId = settings.value.api.presets[0].id
    applyPreset(settings.value.api.activePresetId)
  } else {
    settings.value.api.activePresetId = ''
  }
}

const clearAllPresets = () => {
  ensurePresetState()
  if (settings.value.api.presets.length === 0) return

  const ok = window.confirm(t('确认清空全部预设吗？此操作不可撤销。', 'Clear all presets? This action cannot be undone.'))
  if (!ok) return

  settings.value.api.presets.splice(0, settings.value.api.presets.length)
  settings.value.api.activePresetId = ''
}

const goHome = () => {
  router.push('/home')
}

const goSettings = () => {
  router.push('/settings')
}

const saveNetworkSettings = () => {
  systemStore.saveNow()
  saved.value = true
  if (savedTimerId) clearTimeout(savedTimerId)
  savedTimerId = setTimeout(() => {
    saved.value = false
  }, 1200)
}

const clearApiReportHistory = () => {
  if ((apiReports.value || []).length === 0) return
  const ok = window.confirm(
    t(
      '确认清空全部调用/报错历史吗？此操作不可撤销。',
      'Clear all call/error history? This action cannot be undone.',
    ),
  )
  if (!ok) return
  systemStore.clearApiReports()
}

const clearModelState = () => {
  modelOptions.value = []
  modelsError.value = ''
}

const loadModels = async () => {
  const apiUrl = settings.value.api.url?.trim()
  const apiKey = settings.value.api.key?.trim()

  settings.value.api.resolvedKind = detectApiKindFromUrl(apiUrl)

  if (!apiUrl || !apiKey) {
    clearModelState()
    return
  }

  const currentToken = ++modelFetchToken
  modelsLoading.value = true
  modelsError.value = ''

  try {
    const { kind, models } = await fetchAvailableModels({ settings: settings.value })
    if (currentToken !== modelFetchToken) return

    settings.value.api.resolvedKind = kind
    modelOptions.value = [...new Set(models)]

    if (!settings.value.api.model && modelOptions.value.length > 0) {
      settings.value.api.model = modelOptions.value[0]
    }
  } catch (error) {
    if (currentToken !== modelFetchToken) return
    modelOptions.value = []
    modelsError.value = formatApiErrorForUi(error, t('模型拉取失败，请检查设置。', 'Failed to load models. Check your settings.'))
    systemStore.addApiReport({
      level: 'error',
      module: 'network',
      action: 'fetch_models',
      provider: settings.value.api.resolvedKind || '',
      model: settings.value.api.model || '',
      statusCode: Number.isFinite(Number(error?.status)) ? Number(error.status) : 0,
      code: typeof error?.code === 'string' ? error.code : '',
      message: modelsError.value || formatApiErrorForUi(error),
    })
  } finally {
    if (currentToken === modelFetchToken) {
      modelsLoading.value = false
    }
  }
}

const formatReportTime = (timestamp) => {
  if (!timestamp) return '--:--'
  const date = new Date(timestamp)
  if (Number.isNaN(date.getTime())) return '--:--'
  const locale = languageBase.value === 'zh' ? 'zh-CN' : systemLanguage.value
  return date.toLocaleString(locale, {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const scheduleAutoLoadModels = () => {
  if (modelFetchTimerId) {
    clearTimeout(modelFetchTimerId)
    modelFetchTimerId = null
  }

  const apiUrl = settings.value.api.url?.trim()
  const apiKey = settings.value.api.key?.trim()

  settings.value.api.resolvedKind = detectApiKindFromUrl(apiUrl)

  if (!apiUrl || !apiKey) {
    clearModelState()
    return
  }

  modelFetchTimerId = setTimeout(() => {
    loadModels()
  }, 600)
}

watch(
  () => settings.value.api.activePresetId,
  (presetId) => {
    applyPreset(presetId)
  },
)

watch(
  () => [settings.value.api.url, settings.value.api.key],
  () => {
    clearModelState()
    scheduleAutoLoadModels()
  },
)

onBeforeUnmount(() => {
  if (modelFetchTimerId) {
    clearTimeout(modelFetchTimerId)
    modelFetchTimerId = null
  }
  if (savedTimerId) {
    clearTimeout(savedTimerId)
    savedTimerId = null
  }
})

ensurePresetState()
</script>

<template>
  <div class="w-full h-full bg-gray-100 flex flex-col text-black">
    <div class="pt-12 pb-3 px-4 bg-white/80 backdrop-blur sticky top-0 z-10 border-b border-gray-200 flex items-center">
      <button @click="goHome" class="mr-2 text-blue-500 flex items-center gap-1 text-sm font-medium">
        <i class="fas fa-chevron-left"></i> {{ t('主页', 'Home') }}
      </button>
      <h1 class="text-2xl font-bold flex-1">{{ t('网络与 API', 'Network & API') }}</h1>
      <button @click="goSettings" class="text-blue-500 text-sm">{{ t('设置', 'Settings') }}</button>
    </div>

    <div class="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
      <div class="bg-white rounded-xl p-4">
        <label class="text-xs text-gray-500 block mb-1">{{ t('API 接口 URL', 'API Endpoint URL') }}</label>
        <input
          v-model="settings.api.url"
          type="text"
          class="w-full border-b border-gray-200 py-1 outline-none text-sm font-mono text-gray-700"
          placeholder="https://api.openai.com/v1/chat/completions"
        />
        <p class="text-[10px] text-gray-400 mt-2">{{ t('输入 URL 后会自动识别类型，并尝试拉取模型列表。', 'The type will be auto-detected after URL input, then model list will be fetched.') }}</p>
      </div>

      <div class="bg-white rounded-xl p-4">
        <label class="text-xs text-gray-500 block mb-1">API Key</label>
        <div class="flex items-center gap-2">
          <input
            v-model="settings.api.key"
            :type="showApiKey ? 'text' : 'password'"
            class="flex-1 border-b border-gray-200 py-1 outline-none text-sm font-mono"
            placeholder="sk-..."
          />
          <button
            @click="showApiKey = !showApiKey"
            class="px-2 py-1 text-xs rounded border border-gray-200 text-gray-600 hover:bg-gray-50"
          >
            {{ showApiKey ? t('隐藏', 'Hide') : t('显示', 'Show') }}
          </button>
        </div>
      </div>

      <div class="bg-white rounded-xl p-4">
        <label class="text-xs text-gray-500 block mb-2">{{ t('保存为预设', 'Save as preset') }}</label>
        <div class="flex gap-2">
          <input
            v-model="presetName"
            type="text"
            class="flex-1 border-b border-gray-200 py-1 outline-none text-sm"
            :placeholder="t('例如：主账号 / 测试网关', 'Example: Primary / Test Gateway')"
          />
          <button
            @click="savePreset"
            class="px-3 py-1.5 rounded-md bg-blue-500 text-white text-xs hover:bg-blue-600 transition"
          >
            {{ t('保存', 'Save') }}
          </button>
        </div>
      </div>

      <div class="bg-white rounded-xl p-4" v-if="presets.length > 0">
        <label class="text-xs text-gray-500 block mb-1">{{ t('已存预设', 'Saved presets') }}</label>
        <select
          v-model="settings.api.activePresetId"
          class="w-full border rounded-lg px-2 py-2 text-sm outline-none bg-white"
        >
          <option value="">{{ t('请选择预设', 'Select a preset') }}</option>
          <option v-for="preset in presets" :key="preset.id" :value="preset.id">
            {{ preset.name }}
          </option>
        </select>
        <div class="flex gap-2 mt-2">
          <button
            @click="removeActivePreset"
            :disabled="!settings.api.activePresetId"
            class="flex-1 px-3 py-1.5 rounded-md text-xs transition"
            :class="
              settings.api.activePresetId
                ? 'bg-red-500 text-white hover:bg-red-600'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            "
          >
            {{ t('删除当前预设', 'Delete current preset') }}
          </button>
          <button
            @click="clearAllPresets"
            :disabled="presets.length === 0"
            class="flex-1 px-3 py-1.5 rounded-md text-xs transition"
            :class="
              presets.length > 0
                ? 'bg-gray-800 text-white hover:bg-black'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            "
          >
            {{ t('清空全部预设', 'Clear all presets') }}
          </button>
        </div>
      </div>

      <div class="bg-white rounded-xl p-4">
        <div class="flex items-center justify-between mb-2">
          <span class="text-xs text-gray-500">{{ t('已识别类型', 'Detected type') }}</span>
          <span class="text-xs font-semibold text-gray-700">{{ apiKindLabel }}</span>
        </div>

        <button
          @click="loadModels"
          :disabled="modelsLoading"
          class="w-full rounded-lg py-2 text-sm transition"
          :class="modelsLoading ? 'bg-gray-100 text-gray-400' : 'bg-blue-500 text-white hover:bg-blue-600'"
        >
          {{ modelsLoading ? t('拉取中...', 'Loading...') : t('刷新模型列表', 'Refresh model list') }}
        </button>

        <p v-if="modelsError" class="text-xs text-red-500 mt-2">{{ modelsError }}</p>
      </div>

      <div class="bg-white rounded-xl p-4" v-if="modelOptions.length > 0">
        <label class="text-xs text-gray-500 block mb-1">{{ t('可用模型（自动拉取）', 'Available models (auto fetched)') }}</label>
        <select
          v-model="settings.api.model"
          class="w-full border rounded-lg px-2 py-2 text-sm outline-none bg-white"
        >
          <option v-for="model in modelOptions" :key="model" :value="model">{{ model }}</option>
        </select>
      </div>

      <div class="bg-white rounded-xl p-4">
        <label class="text-xs text-gray-500 block mb-1">{{ t('模型名（手动兜底）', 'Model name (manual fallback)') }}</label>
        <input
          v-model="settings.api.model"
          type="text"
          class="w-full border-b border-gray-200 py-1 outline-none text-sm font-mono"
          placeholder="gpt-4o-mini / gemini-2.5-flash"
        />
        <p class="text-[10px] text-gray-400 mt-2">{{ t('如果模型接口受限或跨域失败，可直接手动填写模型名。', 'If model API is limited or blocked by CORS, enter model name manually.') }}</p>
      </div>

      <div class="bg-white rounded-xl p-4">
        <div class="flex items-center justify-between mb-2">
          <p class="text-xs text-gray-500">{{ t('调用/报错历史', 'Call/Error History') }}</p>
          <button
            @click="clearApiReportHistory"
            class="text-[11px] px-2 py-1 rounded border border-gray-200 text-gray-600 hover:bg-gray-50"
          >
            {{ t('清空', 'Clear') }}
          </button>
        </div>

        <div class="grid grid-cols-2 gap-2 mb-2">
          <select v-model="reportModuleFilter" class="border rounded-md px-2 py-1 text-xs bg-white outline-none">
            <option v-for="item in reportModuleOptions" :key="item.value" :value="item.value">
              {{ item.label }}
            </option>
          </select>
          <select v-model="reportLevelFilter" class="border rounded-md px-2 py-1 text-xs bg-white outline-none">
            <option v-for="item in reportLevelOptions" :key="item.value" :value="item.value">
              {{ item.label }}
            </option>
          </select>
        </div>

        <p v-if="networkReports.length === 0" class="text-xs text-gray-400">
          {{ t('暂无匹配记录。', 'No matching records.') }}
        </p>

        <div v-else class="space-y-2 max-h-52 overflow-y-auto no-scrollbar">
          <div v-for="item in networkReports" :key="item.id" class="rounded-lg border border-gray-200 p-2">
            <div class="flex items-center justify-between gap-2">
              <p class="text-[11px] font-semibold text-gray-700">
                {{ item.module }} · {{ item.action }}
              </p>
              <p class="text-[10px] text-gray-400">{{ formatReportTime(item.createdAt) }}</p>
            </div>
            <p class="text-[11px] text-gray-600 mt-1 line-clamp-2">{{ item.message || t('未知错误', 'Unknown error') }}</p>
            <p class="text-[10px] text-gray-400 mt-1">
              {{ t('级别', 'Level') }}: {{ item.level || '-' }} ·
              {{ t('状态码', 'Status') }}: {{ item.statusCode || '-' }} ·
              Code: {{ item.code || '-' }} ·
              {{ t('模型', 'Model') }}: {{ item.model || '-' }} ·
              {{ t('供应商', 'Provider') }}: {{ item.provider || '-' }}
            </p>
          </div>
        </div>
      </div>

      <button
        @click="saveNetworkSettings"
        class="w-full py-3 rounded-xl text-sm font-semibold transition"
        :class="saved ? 'bg-green-500 text-white' : 'bg-blue-500 text-white hover:bg-blue-600'"
      >
        {{ saved ? t('已保存', 'Saved') : t('保存网络设置', 'Save network settings') }}
      </button>
    </div>
  </div>
</template>
