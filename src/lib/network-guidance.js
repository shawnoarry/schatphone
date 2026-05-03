import { detectApiKindFromUrl } from './ai'

const OPENAI_TEMPLATE = Object.freeze({
  id: 'openai',
  kind: 'openai_compatible',
  nameZh: 'OpenAI 官方',
  nameEn: 'OpenAI Official',
  url: 'https://api.openai.com/v1/chat/completions',
  model: 'gpt-4o-mini',
  keyHint: 'sk-...',
})

const OPENAI_COMPAT_TEMPLATE = Object.freeze({
  id: 'openai-compatible',
  kind: 'openai_compatible',
  nameZh: 'OpenAI 兼容网关',
  nameEn: 'OpenAI-Compatible Gateway',
  url: 'https://your-gateway.example.com/v1/chat/completions',
  model: 'gpt-4o-mini',
  keyHint: 'sk-... / provider key',
})

const GEMINI_TEMPLATE = Object.freeze({
  id: 'gemini',
  kind: 'gemini',
  nameZh: 'Google Gemini',
  nameEn: 'Google Gemini',
  url: 'https://generativelanguage.googleapis.com/v1beta/models',
  model: 'gemini-2.5-flash',
  keyHint: 'AIza...',
})

export const NETWORK_PROVIDER_TEMPLATES = Object.freeze([
  OPENAI_TEMPLATE,
  OPENAI_COMPAT_TEMPLATE,
  GEMINI_TEMPLATE,
])

const normalizeText = (value) => (typeof value === 'string' ? value.trim() : '')

export const getNetworkProviderTemplate = (templateId) =>
  NETWORK_PROVIDER_TEMPLATES.find((item) => item.id === templateId) || null

export const applyNetworkProviderTemplate = (apiSettings = {}, templateId) => {
  const template = getNetworkProviderTemplate(templateId)
  if (!template) return false

  apiSettings.url = template.url
  apiSettings.model = template.model
  apiSettings.resolvedKind = template.kind
  return true
}

export const buildNetworkSetupState = (apiSettings = {}) => {
  const url = normalizeText(apiSettings.url)
  const key = normalizeText(apiSettings.key)
  const model = normalizeText(apiSettings.model)
  const detectedKind = detectApiKindFromUrl(url)
  const hasUrl = Boolean(url)
  const hasKey = Boolean(key)
  const hasModel = Boolean(model)
  const completedSteps = [hasUrl, hasKey, hasModel].filter(Boolean).length

  let nextStep = 'test'
  if (!hasUrl) nextStep = 'url'
  else if (!hasKey) nextStep = 'key'
  else if (!hasModel) nextStep = 'model'

  return {
    hasUrl,
    hasKey,
    hasModel,
    completedSteps,
    totalSteps: 3,
    progressPercent: Math.round((completedSteps / 3) * 100),
    readyToTest: hasUrl && hasKey && hasModel,
    detectedKind,
    nextStep,
  }
}

export const buildNetworkSetupCopy = (state = {}) => {
  const detectedKind = state.detectedKind || 'openai_compatible'
  const providerLabelZh = detectedKind === 'gemini' ? 'Gemini' : 'OpenAI 兼容'
  const providerLabelEn = detectedKind === 'gemini' ? 'Gemini' : 'OpenAI-compatible'

  if (state.nextStep === 'url') {
    return {
      titleZh: '先选择或填写接口地址',
      titleEn: 'Choose or enter an endpoint first',
      detailZh: '可以点下方供应商模板快速填入 URL，再粘贴自己的 Key。',
      detailEn: 'Use a provider template below to fill the URL, then paste your own key.',
      actionZh: '选择模板',
      actionEn: 'Choose template',
      tone: 'warn',
      providerLabelZh,
      providerLabelEn,
    }
  }

  if (state.nextStep === 'key') {
    return {
      titleZh: '继续粘贴 API Key',
      titleEn: 'Paste the API key next',
      detailZh: `当前识别为 ${providerLabelZh}，Key 只保存在本地配置中。`,
      detailEn: `Detected as ${providerLabelEn}. The key is only stored in local settings.`,
      actionZh: '填写 Key',
      actionEn: 'Fill key',
      tone: 'warn',
      providerLabelZh,
      providerLabelEn,
    }
  }

  if (state.nextStep === 'model') {
    return {
      titleZh: '选择或填写模型名',
      titleEn: 'Choose or enter a model',
      detailZh: '可先刷新模型列表；如果供应商限制模型接口，也可以直接手动填写。',
      detailEn: 'Refresh the model list first, or type a model manually if the provider blocks model listing.',
      actionZh: '刷新模型',
      actionEn: 'Refresh models',
      tone: 'info',
      providerLabelZh,
      providerLabelEn,
    }
  }

  return {
    titleZh: '配置已可测试',
    titleEn: 'Configuration is ready to test',
    detailZh: '点击刷新模型列表来确认 URL、Key 与模型接口是否可用。',
    detailEn: 'Refresh models to verify the endpoint, key, and model API.',
    actionZh: '测试连接',
    actionEn: 'Test connection',
    tone: 'success',
    providerLabelZh,
    providerLabelEn,
  }
}
