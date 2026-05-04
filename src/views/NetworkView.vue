<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute, useRouter } from 'vue-router'
import { useSystemStore } from '../stores/system'
import { callAI, detectApiKindFromUrl, fetchAvailableModels, formatApiErrorForUi } from '../lib/ai'
import {
  NETWORK_PROVIDER_TEMPLATES,
  applyNetworkProviderTemplate,
  buildNetworkEndpointGuidance,
  buildNetworkFailureGuidance,
  buildNetworkPresetSaveGuidance,
  buildNetworkSetupCopy,
  buildNetworkSetupState,
} from '../lib/network-guidance'
import {
  filterNetworkReports,
  normalizeNetworkReportLevelFilter,
  normalizeNetworkReportModuleFilter,
  summarizeNetworkReports,
} from '../lib/network-report-state'
import { useDialog } from '../composables/useDialog'
import { useI18n } from '../composables/useI18n'
import NetworkDiagnosticsPanel from '../components/network/NetworkDiagnosticsPanel.vue'
import NetworkManualModelSavePanel from '../components/network/NetworkManualModelSavePanel.vue'
import NetworkSetupPresetPanel from '../components/network/NetworkSetupPresetPanel.vue'
import NetworkSmokeControlsPanel from '../components/network/NetworkSmokeControlsPanel.vue'

const router = useRouter()
const route = useRoute()
const systemStore = useSystemStore()
const { settings, apiReports } = storeToRefs(systemStore)
const { t, systemLanguage, languageBase } = useI18n()
const { confirmDialog } = useDialog()

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
const connectionGuidance = ref(null)
const smokeTestLoading = ref(false)
const smokeTestResult = ref(null)
const smokeTestError = ref('')

let modelFetchTimerId = null
let modelFetchToken = 0
let smokeTestToken = 0
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
const networkSetupState = computed(() => buildNetworkSetupState(settings.value.api))
const networkSetupCopy = computed(() => buildNetworkSetupCopy(networkSetupState.value))
const endpointGuidance = computed(() => buildNetworkEndpointGuidance(settings.value.api))
const presetSaveGuidance = computed(() => buildNetworkPresetSaveGuidance(settings.value.api))
const reportModuleOptions = computed(() => [
  { value: 'all', label: t('全部模块', 'All modules') },
  { value: 'chat', label: t('聊天', 'Chat') },
  { value: 'network', label: t('网络', 'Network') },
  { value: 'storage', label: t('存储', 'Storage') },
  { value: 'push', label: t('推送', 'Push') },
  { value: 'map', label: t('地图', 'Map') },
  { value: 'shopping', label: t('购物', 'Shopping') },
])
const reportLevelOptions = computed(() => [
  { value: 'all', label: t('全部级别', 'All levels') },
  { value: 'error', label: t('错误', 'Error') },
  { value: 'info', label: t('信息', 'Info') },
])
const networkReports = computed(() => {
  return filterNetworkReports(apiReports.value, {
    moduleFilter: reportModuleFilter.value,
    levelFilter: reportLevelFilter.value,
  })
})

const reportSummary = computed(() => summarizeNetworkReports(apiReports.value))
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
  const guidance = presetSaveGuidance.value
  if (guidance?.tone === 'warn') {
    setUiFeedback('warn', t('预设已保存，但建议稍后完成连接测试确认。', 'Preset saved, but run a connection test when possible.'), 3200)
    return
  }
  setUiFeedback('success', t('预设已保存，Key 仅保存在本地配置中。', 'Preset saved. The key stays in local settings.'))
}

const applyProviderTemplate = (templateId) => {
  const ok = applyNetworkProviderTemplate(settings.value.api, templateId)
  if (!ok) return
  clearModelState()
  scheduleAutoLoadModels()
  setUiFeedback('success', t('已套用供应商模板，请继续填写 Key。', 'Provider template applied. Continue with your key.'))
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

const removeActivePreset = async () => {
  ensurePresetState()
  const activeId = settings.value.api.activePresetId
  if (!activeId) return

  const index = presets.value.findIndex((item) => item.id === activeId)
  if (index < 0) return

  const ok = await confirmDialog({
    title: t('删除当前预设', 'Delete current preset'),
    message: t('确认删除当前预设吗？', 'Delete current preset?'),
    confirmText: t('删除', 'Delete'),
    cancelText: t('取消', 'Cancel'),
    tone: 'danger',
  })
  if (!ok) return

  settings.value.api.presets.splice(index, 1)

  if (settings.value.api.presets.length > 0) {
    settings.value.api.activePresetId = settings.value.api.presets[0].id
    applyPreset(settings.value.api.activePresetId)
  } else {
    settings.value.api.activePresetId = ''
  }
}

const clearAllPresets = async () => {
  ensurePresetState()
  if (settings.value.api.presets.length === 0) return

  const ok = await confirmDialog({
    title: t('清空全部预设', 'Clear all presets'),
    message: t('确认清空全部预设吗？此操作不可撤销。', 'Clear all presets? This action cannot be undone.'),
    confirmText: t('清空', 'Clear'),
    cancelText: t('取消', 'Cancel'),
    tone: 'danger',
  })
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

const openPushSettings = () => {
  router.push({
    path: '/settings',
    query: {
      menu: 'notification',
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

const clearApiReportHistory = async () => {
  if ((apiReports.value || []).length === 0) return
  const scopedByModule = reportModuleFilter.value !== 'all'
  const scopedByLevel = reportLevelFilter.value !== 'all'
  const scopedClear = scopedByModule || scopedByLevel
  const ok = await confirmDialog({
    title: scopedClear ? t('清空筛选记录', 'Clear filtered diagnostics') : t('清空全部诊断记录', 'Clear all diagnostics'),
    message: scopedClear
      ? t(
          '确认清空当前筛选结果吗？仅会删除筛选命中的记录。',
          'Clear current filtered records only? Only matched entries will be removed.',
        )
      : t(
          '确认清空全部诊断记录吗？此操作不可撤销。',
          'Clear all diagnostics records? This action cannot be undone.',
        ),
    confirmText: t('清空', 'Clear'),
    cancelText: t('取消', 'Cancel'),
    tone: 'danger',
  })
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

const buildPreflightError = (apiUrl, apiKey) => {
  if (!apiUrl) return { code: 'MISSING_URL' }
  if (!apiKey) return { code: 'NO_API_KEY' }
  return null
}

const recordNetworkFailure = (guidance, message) => {
  systemStore.addApiReport({
    level: 'error',
    module: 'network',
    action: 'fetch_models',
    provider: guidance.provider || settings.value.api.resolvedKind || '',
    model: guidance.model || settings.value.api.model || '',
    statusCode: guidance.statusCode || 0,
    code: guidance.code || '',
    message: message || guidance.detailZh || guidance.detailEn || '',
  })
}

const recordChatSmokeResult = (level, payload = {}) => {
  systemStore.addApiReport({
    level,
    module: 'network',
    action: 'chat_smoke_test',
    provider: payload.provider || settings.value.api.resolvedKind || detectApiKindFromUrl(settings.value.api.url),
    model: payload.model || settings.value.api.model || '',
    statusCode: payload.statusCode || 0,
    code: payload.code || '',
    message: payload.message || '',
  })
}

const loadModels = async (options = {}) => {
  const manual = options?.manual === true
  const apiUrl = settings.value.api.url?.trim()
  const apiKey = settings.value.api.key?.trim()

  settings.value.api.resolvedKind = detectApiKindFromUrl(apiUrl)

  const preflightError = buildPreflightError(apiUrl, apiKey)
  if (preflightError) {
    clearModelState()
    if (manual) {
      const guidance = buildNetworkFailureGuidance(preflightError, settings.value.api)
      connectionGuidance.value = guidance
      modelsError.value = t(guidance.detailZh, guidance.detailEn)
      recordNetworkFailure(guidance, modelsError.value)
      setUiFeedback('warn', t(guidance.fixZh, guidance.fixEn), 3200)
    }
    return
  }

  const currentToken = ++modelFetchToken
  modelsLoading.value = true
  modelsError.value = ''
  connectionGuidance.value = null

  try {
    const { kind, models } = await fetchAvailableModels({ settings: settings.value })
    if (currentToken !== modelFetchToken) return

    settings.value.api.resolvedKind = kind
    modelOptions.value = [...new Set(models)]

    if (!settings.value.api.model && modelOptions.value.length > 0) {
      settings.value.api.model = modelOptions.value[0]
    }
    connectionGuidance.value = null
    if (manual) {
      setUiFeedback('success', t('连接测试通过，模型列表已更新。', 'Connection test passed. Model list updated.'))
    }
  } catch (error) {
    if (currentToken !== modelFetchToken) return
    modelOptions.value = []
    modelsError.value = formatApiErrorForUi(error, t('模型拉取失败，请检查设置。', 'Failed to load models. Check your settings.'))
    const guidance = buildNetworkFailureGuidance(error, settings.value.api)
    connectionGuidance.value = guidance
    recordNetworkFailure(guidance, modelsError.value || guidance.detailZh)
    if (manual) {
      setUiFeedback('error', t(guidance.fixZh, guidance.fixEn), 4200)
    }
  } finally {
    if (currentToken === modelFetchToken) {
      modelsLoading.value = false
    }
  }
}

const runChatSmokeTest = async () => {
  const apiUrl = settings.value.api.url?.trim()
  const apiKey = settings.value.api.key?.trim()
  const preflightError = buildPreflightError(apiUrl, apiKey)
  settings.value.api.resolvedKind = detectApiKindFromUrl(apiUrl)

  if (preflightError) {
    const guidance = buildNetworkFailureGuidance(preflightError, settings.value.api)
    connectionGuidance.value = guidance
    smokeTestResult.value = null
    smokeTestError.value = t(guidance.detailZh, guidance.detailEn)
    recordChatSmokeResult('error', {
      provider: guidance.provider,
      model: guidance.model,
      statusCode: guidance.statusCode,
      code: guidance.code,
      message: smokeTestError.value,
    })
    setUiFeedback('warn', t(guidance.fixZh, guidance.fixEn), 3600)
    return
  }

  const currentToken = ++smokeTestToken
  smokeTestLoading.value = true
  smokeTestResult.value = null
  smokeTestError.value = ''
  connectionGuidance.value = null

  try {
    const reply = await callAI({
      settings: settings.value,
      systemPrompt:
        'You are a connection smoke-test endpoint. Reply with exactly: OK',
      messages: [
        {
          role: 'user',
          content: 'Return exactly OK if this Chat completion path works.',
        },
      ],
    })
    if (currentToken !== smokeTestToken) return

    const preview = typeof reply === 'string' ? reply.trim().slice(0, 80) : ''
    smokeTestResult.value = {
      provider: settings.value.api.resolvedKind || detectApiKindFromUrl(settings.value.api.url),
      model: settings.value.api.model || '',
      preview: preview || 'OK',
    }
    recordChatSmokeResult('info', {
      provider: smokeTestResult.value.provider,
      model: smokeTestResult.value.model,
      code: 'CHAT_SMOKE_OK',
      message: `Chat smoke test succeeded: ${smokeTestResult.value.preview}`,
    })
    setUiFeedback('success', t('Chat 烟测通过，当前配置可用于真实聊天调用。', 'Chat smoke test passed. Current settings can call Chat.'))
  } catch (error) {
    if (currentToken !== smokeTestToken) return

    const guidance = buildNetworkFailureGuidance(error, settings.value.api)
    const message = formatApiErrorForUi(error, t('Chat 烟测失败，请检查设置。', 'Chat smoke test failed. Check your settings.'))
    connectionGuidance.value = guidance
    smokeTestResult.value = null
    smokeTestError.value = message
    recordChatSmokeResult('error', {
      provider: guidance.provider,
      model: guidance.model,
      statusCode: guidance.statusCode,
      code: guidance.code,
      message,
    })
    setUiFeedback('error', t(guidance.fixZh, guidance.fixEn), 4200)
  } finally {
    if (currentToken === smokeTestToken) {
      smokeTestLoading.value = false
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
    connectionGuidance.value = null
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
    reportModuleFilter.value = normalizeNetworkReportModuleFilter(
      typeof query?.reportModule === 'string' ? query.reportModule : '',
    )
    reportLevelFilter.value = normalizeNetworkReportLevelFilter(
      typeof query?.reportLevel === 'string' ? query.reportLevel : '',
    )
  },
  { immediate: true },
)

watch(
  () => [settings.value.api.url, settings.value.api.key],
  () => {
    clearModelState()
    smokeTestToken += 1
    smokeTestLoading.value = false
    smokeTestResult.value = null
    smokeTestError.value = ''
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
      <NetworkSetupPresetPanel
        v-model:api-url="settings.api.url"
        v-model:api-key="settings.api.key"
        v-model:show-api-key="showApiKey"
        v-model:preset-name="presetName"
        v-model:active-preset-id="settings.api.activePresetId"
        :network-setup-copy="networkSetupCopy"
        :network-setup-state="networkSetupState"
        :provider-templates="NETWORK_PROVIDER_TEMPLATES"
        :endpoint-guidance="endpointGuidance"
        :preset-save-guidance="presetSaveGuidance"
        :presets="presets"
        :ui-feedback-type="uiFeedbackType"
        :ui-feedback-message="uiFeedbackMessage"
        @apply-template="applyProviderTemplate"
        @save-preset="savePreset"
        @remove-active-preset="removeActivePreset"
        @clear-all-presets="clearAllPresets"
      />

      <NetworkSmokeControlsPanel
        v-model="settings.api.model"
        :api-kind-label="apiKindLabel"
        :models-loading="modelsLoading"
        :models-error="modelsError"
        :connection-guidance="connectionGuidance"
        :smoke-test-loading="smokeTestLoading"
        :smoke-test-result="smokeTestResult"
        :smoke-test-error="smokeTestError"
        :model-options="modelOptions"
        @test-models="loadModels({ manual: true })"
        @run-chat-smoke-test="runChatSmokeTest"
      />

      <NetworkManualModelSavePanel
        v-model="settings.api.model"
        :saved="saved"
        @save-settings="saveNetworkSettings"
      />

      <NetworkDiagnosticsPanel
        v-model:report-module-filter="reportModuleFilter"
        v-model:report-level-filter="reportLevelFilter"
        :report-summary="reportSummary"
        :network-reports="networkReports"
        :report-module-options="reportModuleOptions"
        :report-level-options="reportLevelOptions"
        :copied-report-id="copiedReportId"
        :format-report-time="formatReportTime"
        @clear-reports="clearApiReportHistory"
        @copy-report="copyReport"
        @open-storage-diagnostics="openStorageDiagnostics"
        @open-push-settings="openPushSettings"
      />

    </div>
  </div>
</template>
