<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute, useRouter } from 'vue-router'
import { useSystemStore } from '../stores/system'
import { detectApiKindFromUrl, fetchAvailableModels, formatApiErrorForUi } from '../lib/ai'
import { useI18n } from '../composables/useI18n'

const router = useRouter()
const route = useRoute()
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
const copiedReportId = ref('')
const uiFeedbackType = ref('')
const uiFeedbackMessage = ref('')

let modelFetchTimerId = null
let modelFetchToken = 0
let savedTimerId = null
let copiedReportTimerId = null
let uiFeedbackTimerId = null

const setUiFeedback = (type, message, durationMs = 1800) => {
  uiFeedbackType.value = type
  uiFeedbackMessage.value = message
  if (uiFeedbackTimerId) clearTimeout(uiFeedbackTimerId)
  uiFeedbackTimerId = setTimeout(() => {
    uiFeedbackType.value = ''
    uiFeedbackMessage.value = ''
  }, durationMs)
}

const normalizeReportModuleFilter = (value) => {
  const raw = typeof value === 'string' ? value.trim() : ''
  const allowed = new Set(['all', 'chat', 'network', 'storage', 'map', 'shopping'])
  return allowed.has(raw) ? raw : 'all'
}

const normalizeReportLevelFilter = (value) => {
  const raw = typeof value === 'string' ? value.trim() : ''
  return raw === 'error' || raw === 'info' ? raw : 'all'
}

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
  { value: 'storage', label: t('存储', 'Storage') },
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

const reportSummary = computed(() => {
  const list = Array.isArray(apiReports.value) ? apiReports.value : []
  const total = list.length
  const errorCount = list.filter((item) => item?.level === 'error').length
  const infoCount = total - errorCount
  return {
    total,
    errorCount,
    infoCount: Math.max(0, infoCount),
  }
})

const moduleLabel = (moduleKey) => {
  if (moduleKey === 'chat') return t('聊天', 'Chat')
  if (moduleKey === 'network') return t('网络', 'Network')
  if (moduleKey === 'storage') return t('存储', 'Storage')
  if (moduleKey === 'map') return t('地图', 'Map')
  if (moduleKey === 'shopping') return t('购物', 'Shopping')
  return t('未知模块', 'Unknown module')
}

const actionLabel = (actionKey) => {
  if (actionKey === 'fetch_models') return t('拉取模型列表', 'Fetch model list')
  if (actionKey === 'call_ai') return t('调用 AI', 'Call AI')
  if (actionKey === 'reroll_reply') return t('重生成回复', 'Reroll reply')
  if (actionKey === 'auto_invoke') return t('自动调用', 'Autonomous invoke')
  if (actionKey === 'audit_storage') return t('检查存储一致性', 'Audit storage consistency')
  if (actionKey === 'repair_storage') return t('修复存储不同步', 'Repair storage drift')
  return actionKey || t('未知动作', 'Unknown action')
}

const reportReasonLabel = (item) => {
  const code = (item?.code || '').toUpperCase()
  const statusCode = Number(item?.statusCode || 0)

  if (code === 'NO_API_KEY') return t('缺少 API Key', 'Missing API key')
  if (code === 'STORAGE_HEALTHY') return t('存储状态健康', 'Storage is healthy')
  if (code === 'STORAGE_MIRROR_DRIFT') return t('存储层不同步', 'Storage mirror drift detected')
  if (code === 'STORAGE_LAYER_INVALID') return t('存储层数据异常', 'Invalid payload in storage layer')
  if (code === 'STORAGE_REPAIR_DONE') return t('存储修复完成', 'Storage repair completed')
  if (code === 'STORAGE_REPAIR_NOOP') return t('无需修复', 'No repair needed')
  if (code === 'STORAGE_REPAIR_PARTIAL') return t('存储修复部分失败', 'Storage repair partially failed')
  if (code === 'INVALID_URL') return t('接口地址格式错误', 'Invalid endpoint URL')
  if (code === 'AUTH' || statusCode === 401 || statusCode === 403)
    return t('鉴权失败（401/403）', 'Authentication failed (401/403)')
  if (code === 'NOT_FOUND' || statusCode === 404) return t('接口不存在（404）', 'Endpoint not found (404)')
  if (code === 'RATE_LIMIT' || statusCode === 429) return t('请求过于频繁（429）', 'Rate limit exceeded (429)')
  if (code === 'TIMEOUT') return t('请求超时', 'Request timeout')
  if (code === 'NETWORK') return t('网络或跨域问题', 'Network or CORS issue')
  if (code === 'PARSE_ERROR') return t('响应格式解析失败', 'Response parsing failed')
  if (code === 'SERVER' || statusCode >= 500) return t('服务端异常（5xx）', 'Server error (5xx)')
  if (code === 'CANCELED') return t('请求被取消', 'Request canceled')
  if (code === 'HTTP_ERROR') return t('HTTP 请求失败', 'HTTP request failed')
  return t('未分类问题', 'Unclassified issue')
}

const reportSuggestionLabel = (item) => {
  const code = (item?.code || '').toUpperCase()
  const statusCode = Number(item?.statusCode || 0)

  if (code === 'NO_API_KEY') return t('请在本页补全 API Key。', 'Please fill in API key on this page.')
  if (code === 'STORAGE_HEALTHY')
    return t('当前存储层状态正常，无需操作。', 'Storage layers are healthy; no action required.')
  if (code === 'STORAGE_MIRROR_DRIFT')
    return t('可在设置-关于执行一键修复。', 'Run one-click repair in Settings > About.')
  if (code === 'STORAGE_LAYER_INVALID')
    return t('建议先导出备份，再执行修复与重检。', 'Export backup first, then run repair and re-audit.')
  if (code === 'STORAGE_REPAIR_DONE')
    return t('建议再次执行检查确认一致性。', 'Run audit again to verify consistency.')
  if (code === 'STORAGE_REPAIR_NOOP')
    return t('当前无不同步项，可继续正常使用。', 'No drift found; continue normal usage.')
  if (code === 'STORAGE_REPAIR_PARTIAL')
    return t('查看报告后重试，必要时导出并恢复备份。', 'Review report and retry; export/restore backup if needed.')
  if (code === 'INVALID_URL') return t('检查 URL 是否完整且包含正确路径。', 'Check endpoint URL and verify full path.')
  if (code === 'AUTH' || statusCode === 401 || statusCode === 403)
    return t('更换可用 Key，或检查供应商权限设置。', 'Use a valid key or verify provider permissions.')
  if (code === 'NOT_FOUND' || statusCode === 404)
    return t('确认网关地址或接口路径是否正确。', 'Confirm gateway address and endpoint path.')
  if (code === 'RATE_LIMIT' || statusCode === 429)
    return t('稍后重试，或切换到其他供应商。', 'Retry later or switch to another provider.')
  if (code === 'TIMEOUT') return t('检查网络后重试，必要时更换网关。', 'Check network and retry; switch gateway if needed.')
  if (code === 'NETWORK')
    return t('优先检查网络与跨域代理设置。', 'Check network first, then CORS/proxy settings.')
  if (code === 'PARSE_ERROR')
    return t('确认返回内容是有效 JSON。', 'Ensure upstream response is valid JSON.')
  if (code === 'SERVER' || statusCode >= 500)
    return t('属于服务端问题，建议稍后再试。', 'Server-side issue. Retry later.')
  if (code === 'CANCELED')
    return t('这是手动取消记录，无需处理。', 'This is a manual cancel record; no action needed.')
  return t('可先复制报告并排查 URL/Key/模型三项。', 'Copy report and verify URL, key, and model first.')
}

const copyReport = async (item) => {
  if (!item) return
  const payload = [
    `time: ${formatReportTime(item.createdAt)}`,
    `module: ${item.module || '-'}`,
    `action: ${item.action || '-'}`,
    `level: ${item.level || '-'}`,
    `status: ${item.statusCode || '-'}`,
    `code: ${item.code || '-'}`,
    `provider: ${item.provider || '-'}`,
    `model: ${item.model || '-'}`,
    `message: ${item.message || '-'}`,
  ].join('\n')

  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(payload)
    } else {
      const textArea = document.createElement('textarea')
      textArea.value = payload
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
    }
    copiedReportId.value = item.id
    if (copiedReportTimerId) clearTimeout(copiedReportTimerId)
    copiedReportTimerId = setTimeout(() => {
      copiedReportId.value = ''
    }, 1200)
  } catch {
    setUiFeedback('error', t('复制失败，请手动记录。', 'Copy failed. Please record manually.'))
  }
}

const savePreset = () => {
  ensurePresetState()
  const name = presetName.value.trim()
  const url = settings.value.api.url?.trim()
  const key = settings.value.api.key?.trim()
  const model = settings.value.api.model?.trim()

  if (!name) {
    setUiFeedback('error', t('请输入预设名称。', 'Please enter a preset name.'))
    return
  }
  if (!url || !key) {
    setUiFeedback('error', t('请先填写 URL 和 Key。', 'Please enter URL and Key first.'))
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
  setUiFeedback('success', t('预设已保存。', 'Preset saved.'))
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

const openStorageDiagnostics = () => {
  router.push({
    path: '/settings',
    query: {
      menu: 'about',
    },
  })
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
  const scopedByModule = reportModuleFilter.value !== 'all'
  const scopedByLevel = reportLevelFilter.value !== 'all'
  const scopedClear = scopedByModule || scopedByLevel
  const ok = window.confirm(
    scopedClear
      ? t(
          '确认清空当前筛选结果吗？仅会删除筛选命中的记录。',
          'Clear current filtered records only? Only matched entries will be removed.',
        )
      : t(
          '确认清空全部调用/报错历史吗？此操作不可撤销。',
          'Clear all call/error history? This action cannot be undone.',
        ),
  )
  if (!ok) return

  const removed = scopedClear
    ? systemStore.clearApiReports({
        module: scopedByModule ? reportModuleFilter.value : '',
        level: scopedByLevel ? reportLevelFilter.value : '',
      })
    : systemStore.clearApiReports()

  if (removed > 0) {
    setUiFeedback(
      'success',
      t(
        `已清空 ${removed} 条记录。`,
        `Cleared ${removed} record(s).`,
      ),
    )
    return
  }

  setUiFeedback(
    'warn',
    t('当前筛选无可清空记录。', 'No records matched current filter.'),
  )
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
  () => route.query,
  (query) => {
    reportModuleFilter.value = normalizeReportModuleFilter(
      typeof query?.reportModule === 'string' ? query.reportModule : '',
    )
    reportLevelFilter.value = normalizeReportLevelFilter(
      typeof query?.reportLevel === 'string' ? query.reportLevel : '',
    )
  },
  { immediate: true },
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
  if (copiedReportTimerId) {
    clearTimeout(copiedReportTimerId)
    copiedReportTimerId = null
  }
  if (uiFeedbackTimerId) {
    clearTimeout(uiFeedbackTimerId)
    uiFeedbackTimerId = null
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

      <p
        v-if="uiFeedbackMessage"
        class="px-1 text-[11px]"
        :class="
          uiFeedbackType === 'error'
            ? 'text-red-600'
            : uiFeedbackType === 'warn'
              ? 'text-amber-600'
              : 'text-emerald-600'
        "
      >
        {{ uiFeedbackMessage }}
      </p>

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

        <div class="grid grid-cols-3 gap-2 mb-3">
          <div class="rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-2">
            <p class="text-[10px] text-gray-500">{{ t('总记录', 'Total') }}</p>
            <p class="text-sm font-semibold text-gray-800">{{ reportSummary.total }}</p>
          </div>
          <div class="rounded-lg border border-red-200 bg-red-50 px-2.5 py-2">
            <p class="text-[10px] text-red-500">{{ t('错误', 'Error') }}</p>
            <p class="text-sm font-semibold text-red-700">{{ reportSummary.errorCount }}</p>
          </div>
          <div class="rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-2">
            <p class="text-[10px] text-blue-500">{{ t('信息', 'Info') }}</p>
            <p class="text-sm font-semibold text-blue-700">{{ reportSummary.infoCount }}</p>
          </div>
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
                {{ moduleLabel(item.module) }} · {{ actionLabel(item.action) }}
              </p>
              <p class="text-[10px] text-gray-400">{{ formatReportTime(item.createdAt) }}</p>
            </div>

            <div class="mt-1 flex items-center gap-1.5">
              <span
                class="inline-flex rounded px-1.5 py-0.5 text-[10px] font-semibold"
                :class="item.level === 'error' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'"
              >
                {{ item.level === 'error' ? t('错误', 'Error') : t('信息', 'Info') }}
              </span>
              <span class="inline-flex rounded bg-gray-100 text-gray-600 px-1.5 py-0.5 text-[10px]">
                {{ t('状态码', 'Status') }}: {{ item.statusCode || '-' }}
              </span>
              <span class="inline-flex rounded bg-gray-100 text-gray-600 px-1.5 py-0.5 text-[10px]">
                Code: {{ item.code || '-' }}
              </span>
            </div>

            <p class="text-[11px] text-gray-600 mt-1 line-clamp-2">
              {{ item.message || t('未知错误', 'Unknown error') }}
            </p>
            <p class="text-[11px] text-gray-700 mt-1">
              {{ t('问题类型', 'Issue type') }}: {{ reportReasonLabel(item) }}
            </p>
            <p class="text-[11px] text-blue-700 mt-1">
              {{ t('建议处理', 'Suggested fix') }}: {{ reportSuggestionLabel(item) }}
            </p>
            <p class="text-[10px] text-gray-400 mt-1">
              {{ t('模型', 'Model') }}: {{ item.model || '-' }} ·
              {{ t('供应商', 'Provider') }}: {{ item.provider || '-' }}
            </p>
            <div class="mt-2 flex justify-end gap-2">
              <button
                v-if="item.module === 'storage'"
                @click="openStorageDiagnostics"
                class="text-[11px] px-2 py-1 rounded border border-blue-200 text-blue-600 hover:bg-blue-50"
              >
                {{ t('前往修复', 'Go to repair') }}
              </button>
              <button
                @click="copyReport(item)"
                class="text-[11px] px-2 py-1 rounded border border-gray-200 text-gray-600 hover:bg-gray-50"
              >
                {{ copiedReportId === item.id ? t('已复制', 'Copied') : t('复制报告', 'Copy report') }}
              </button>
            </div>
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
