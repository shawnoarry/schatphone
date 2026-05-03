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
const normalizeErrorCode = (value) => (typeof value === 'string' ? value.trim().toUpperCase() : '')
const normalizeStatusCode = (value) => {
  const status = Number(value)
  return Number.isFinite(status) && status > 0 ? Math.floor(status) : 0
}

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

export const buildNetworkFailureGuidance = (error = {}, apiSettings = {}) => {
  const url = normalizeText(apiSettings.url)
  const model = normalizeText(apiSettings.model)
  const detectedKind = detectApiKindFromUrl(url)
  const providerLabelZh = detectedKind === 'gemini' ? 'Gemini' : 'OpenAI 兼容'
  const providerLabelEn = detectedKind === 'gemini' ? 'Gemini' : 'OpenAI-compatible'
  const rawCode = normalizeErrorCode(error.code)
  const statusCode = normalizeStatusCode(error.status || error.statusCode)
  const code = rawCode || (statusCode >= 500 ? 'SERVER' : statusCode > 0 ? 'HTTP_ERROR' : 'UNKNOWN')

  const base = {
    code,
    statusCode,
    provider: detectedKind,
    providerLabelZh,
    providerLabelEn,
    model,
    tone: 'error',
  }

  if (code === 'MISSING_URL') {
    return {
      ...base,
      titleZh: '接口地址还没填写',
      titleEn: 'Endpoint is missing',
      detailZh: '先选择一个供应商模板，或填写完整的 API 接口地址。',
      detailEn: 'Choose a provider template first, or enter the full API endpoint URL.',
      fixZh: '优先点上方模板；如果使用自建网关，确认地址以 http/https 开头并包含正确路径。',
      fixEn: 'Use a template first. For a custom gateway, make sure the URL starts with http/https and includes the right path.',
    }
  }

  if (code === 'NO_API_KEY') {
    return {
      ...base,
      titleZh: 'API Key 缺失',
      titleEn: 'API key is missing',
      detailZh: `当前识别为 ${providerLabelZh}，但还没有可用于测试的 Key。`,
      detailEn: `Detected as ${providerLabelEn}, but no key is available for testing.`,
      fixZh: '粘贴供应商后台生成的 Key；如果是网关 Key，请确认网关是否接受 Bearer token。',
      fixEn: 'Paste the key generated by the provider. For gateway keys, verify that the gateway accepts Bearer tokens.',
    }
  }

  if (code === 'INVALID_URL') {
    return {
      ...base,
      titleZh: '接口地址格式不正确',
      titleEn: 'Endpoint URL is invalid',
      detailZh: '浏览器无法解析当前 URL，因此请求还没有真正发出。',
      detailEn: 'The browser cannot parse the current URL, so the request was not sent.',
      fixZh: '检查是否缺少 https://、域名或路径；可重新套用供应商模板后再改。',
      fixEn: 'Check for missing https://, domain, or path. Reapply a provider template and adjust from there.',
    }
  }

  if (code === 'AUTH') {
    return {
      ...base,
      titleZh: '鉴权失败',
      titleEn: 'Authentication failed',
      detailZh: `供应商返回 ${statusCode || '401/403'}，通常是 Key 无效、权限不足或项目未启用。`,
      detailEn: `Provider returned ${statusCode || '401/403'}, usually because the key is invalid, lacks permission, or the project is disabled.`,
      fixZh: '重新生成 Key，确认余额/权限/模型访问已开启；Gemini 需确认 API Key 属于同一 Google 项目。',
      fixEn: 'Regenerate the key and verify billing, permissions, and model access. For Gemini, confirm the key belongs to the same Google project.',
    }
  }

  if (code === 'NOT_FOUND') {
    return {
      ...base,
      titleZh: '接口路径不存在',
      titleEn: 'Endpoint path was not found',
      detailZh: `供应商返回 ${statusCode || 404}，通常是 URL 路径或网关转发路径不匹配。`,
      detailEn: `Provider returned ${statusCode || 404}, usually because the endpoint path or gateway route is wrong.`,
      fixZh: 'OpenAI 兼容接口通常需要 /v1/chat/completions 或 /v1/models；Gemini 通常使用 /v1beta/models。',
      fixEn: 'OpenAI-compatible endpoints usually need /v1/chat/completions or /v1/models. Gemini usually uses /v1beta/models.',
    }
  }

  if (code === 'RATE_LIMIT') {
    return {
      ...base,
      titleZh: '请求过于频繁',
      titleEn: 'Rate limit exceeded',
      detailZh: `供应商返回 ${statusCode || 429}，当前 Key 或网关额度被限流。`,
      detailEn: `Provider returned ${statusCode || 429}. The key or gateway quota is rate limited.`,
      fixZh: '稍后重试；如果在开发调试中频繁触发，可切换备用供应商或降低自动请求频率。',
      fixEn: 'Retry later. During development, switch providers or reduce automatic requests if this repeats.',
    }
  }

  if (code === 'TIMEOUT') {
    return {
      ...base,
      titleZh: '连接超时',
      titleEn: 'Connection timed out',
      detailZh: '请求超过等待时间，可能是网络不稳定、网关响应慢或供应商服务拥堵。',
      detailEn: 'The request exceeded the timeout, possibly due to network instability, a slow gateway, or provider congestion.',
      fixZh: '先重试一次；若仍失败，检查代理/网关可达性，或换成响应更快的供应商。',
      fixEn: 'Retry once. If it still fails, check proxy/gateway reachability or switch to a faster provider.',
    }
  }

  if (code === 'NETWORK') {
    return {
      ...base,
      titleZh: '网络或跨域被阻断',
      titleEn: 'Network or CORS blocked the request',
      detailZh: '浏览器未拿到有效响应，常见原因是本机网络、代理、CORS 或网关证书问题。',
      detailEn: 'The browser did not receive a valid response, commonly due to local network, proxy, CORS, or gateway certificate issues.',
      fixZh: '如果是自建网关，确认已允许当前站点跨域；如果直连供应商，检查网络代理或浏览器控制台。',
      fixEn: 'For custom gateways, allow CORS from this app. For direct provider calls, check proxy settings or the browser console.',
    }
  }

  if (code === 'PARSE_ERROR') {
    return {
      ...base,
      titleZh: '响应格式无法解析',
      titleEn: 'Response could not be parsed',
      detailZh: '接口返回的内容不是预期 JSON，可能是 HTML 错误页、网关提示页或非兼容格式。',
      detailEn: 'The endpoint returned non-JSON content, possibly an HTML error page, gateway notice, or incompatible format.',
      fixZh: '复制诊断报告给网关/供应商排查，确认模型列表接口返回 JSON。',
      fixEn: 'Copy the diagnostic report for your gateway/provider and confirm the model-list endpoint returns JSON.',
    }
  }

  if (code === 'SERVER') {
    return {
      ...base,
      titleZh: '供应商服务端异常',
      titleEn: 'Provider server error',
      detailZh: `供应商返回 ${statusCode || '5xx'}，问题更可能发生在上游服务或网关。`,
      detailEn: `Provider returned ${statusCode || '5xx'}, so the issue is likely upstream or in the gateway.`,
      fixZh: '稍后重试；如果只在某个网关复现，优先检查网关日志。',
      fixEn: 'Retry later. If it only happens through one gateway, inspect that gateway first.',
    }
  }

  return {
    ...base,
    titleZh: '连接测试失败',
    titleEn: 'Connection test failed',
    detailZh: '当前错误无法精确归类，请先按 URL、Key、模型三项排查。',
    detailEn: 'This error is not classified yet. Check endpoint, key, and model first.',
    fixZh: '复制诊断报告并保留状态码、Code、供应商和模型名，便于后续定位。',
    fixEn: 'Copy the diagnostic report and keep status, code, provider, and model for follow-up debugging.',
  }
}
