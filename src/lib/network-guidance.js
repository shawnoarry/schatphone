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
const parseHttpUrl = (value) => {
  const url = normalizeText(value)
  if (!url) return null
  try {
    const parsed = new URL(url)
    const protocol = parsed.protocol.toLowerCase()
    if (protocol !== 'http:' && protocol !== 'https:') return null
    return parsed
  } catch {
    return null
  }
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

export const buildNetworkEndpointGuidance = (apiSettings = {}) => {
  const url = normalizeText(apiSettings.url)
  const model = normalizeText(apiSettings.model)
  const kind = detectApiKindFromUrl(url)
  const providerLabelZh = kind === 'gemini' ? 'Gemini' : 'OpenAI 兼容'
  const providerLabelEn = kind === 'gemini' ? 'Gemini' : 'OpenAI-compatible'
  const parsed = parseHttpUrl(url)
  const host = parsed?.hostname?.toLowerCase() || ''
  const path = parsed?.pathname?.replace(/\/+$/, '').toLowerCase() || ''
  const validHttpUrl = Boolean(parsed)
  const officialOpenAi = host === 'api.openai.com'
  const officialGemini = host === 'generativelanguage.googleapis.com'
  const officialProvider = kind === 'gemini' ? officialGemini : officialOpenAi
  const customGateway = validHttpUrl && !officialProvider
  const pathLooksOk =
    !validHttpUrl
      ? false
      : kind === 'gemini'
        ? path.includes('/v1beta') || path.includes('/v1')
        : path === '/v1' || path.endsWith('/v1') || path.endsWith('/models') || path.endsWith('/chat/completions')

  const checklist = []

  if (!url) {
    return {
      visible: false,
      kind,
      providerLabelZh,
      providerLabelEn,
      validHttpUrl: false,
      customGateway: false,
      pathLooksOk: false,
      tone: 'neutral',
      titleZh: '等待接口地址',
      titleEn: 'Waiting for endpoint',
      detailZh: '选择模板或填写 URL 后会显示路径与网关检查。',
      detailEn: 'Choose a template or enter a URL to see path and gateway checks.',
      checklist,
      modelFallbackActive: false,
    }
  }

  if (!validHttpUrl) {
    checklist.push({
      id: 'protocol',
      tone: 'error',
      textZh: 'URL 必须以 http:// 或 https:// 开头。',
      textEn: 'URL must start with http:// or https://.',
    })
    return {
      visible: true,
      kind,
      providerLabelZh,
      providerLabelEn,
      validHttpUrl,
      customGateway: false,
      pathLooksOk: false,
      tone: 'error',
      titleZh: '接口地址格式需要修正',
      titleEn: 'Endpoint format needs attention',
      detailZh: '当前地址无法作为浏览器请求发送，请先修正协议、域名和路径。',
      detailEn: 'The current endpoint cannot be sent by the browser. Fix protocol, domain, and path first.',
      checklist,
      modelFallbackActive: Boolean(model),
    }
  }

  checklist.push({
    id: 'protocol',
    tone: 'success',
    textZh: parsed.protocol === 'https:' ? '已使用 HTTPS。' : '当前是 HTTP，仅建议用于 localhost 或内网调试。',
    textEn: parsed.protocol === 'https:' ? 'HTTPS is enabled.' : 'HTTP should only be used for localhost or internal testing.',
  })
  checklist.push({
    id: 'path',
    tone: pathLooksOk ? 'success' : 'warn',
    textZh:
      kind === 'gemini'
        ? 'Gemini 通常使用 /v1beta/models，生成请求会自动拼接模型路径。'
        : 'OpenAI 兼容接口建议使用 /v1/chat/completions，模型列表会自动换算到 /v1/models。',
    textEn:
      kind === 'gemini'
        ? 'Gemini usually uses /v1beta/models; generation requests derive the model path automatically.'
        : 'OpenAI-compatible endpoints should use /v1/chat/completions; model listing derives /v1/models automatically.',
  })
  checklist.push({
    id: 'cors',
    tone: customGateway ? 'warn' : 'success',
    textZh: customGateway
      ? '自定义网关需允许当前站点跨域访问，否则浏览器会报网络/CORS 错误。'
      : '官方接口路径已识别；若浏览器环境受限，可改用允许跨域的网关。',
    textEn: customGateway
      ? 'Custom gateways must allow CORS from this app, otherwise the browser reports network/CORS errors.'
      : 'Official endpoint detected. If the browser environment blocks it, use a CORS-enabled gateway.',
  })
  checklist.push({
    id: 'auth',
    tone: customGateway ? 'warn' : 'success',
    textZh:
      kind === 'gemini'
        ? 'Gemini 模型列表会把 Key 作为查询参数发送；请确认 Key 属于目标 Google 项目。'
        : customGateway
          ? 'OpenAI 兼容网关需接受 Bearer token，或在网关侧完成鉴权转换。'
          : 'OpenAI 官方接口会使用 Bearer token 鉴权。',
    textEn:
      kind === 'gemini'
        ? 'Gemini model listing sends the key as a query parameter; confirm it belongs to the target Google project.'
        : customGateway
          ? 'OpenAI-compatible gateways must accept Bearer tokens or translate auth server-side.'
          : 'OpenAI official endpoints use Bearer token authentication.',
  })

  const modelFallbackActive = Boolean(model)
  return {
    visible: true,
    kind,
    providerLabelZh,
    providerLabelEn,
    validHttpUrl,
    customGateway,
    pathLooksOk,
    tone: customGateway || !pathLooksOk ? 'warn' : 'success',
    titleZh: customGateway ? '自定义网关检查' : '供应商接口检查',
    titleEn: customGateway ? 'Custom gateway check' : 'Provider endpoint check',
    detailZh: customGateway
      ? `当前按 ${providerLabelZh} 网关处理。请重点确认路径、CORS 与鉴权转发。`
      : `当前识别为 ${providerLabelZh} 官方/标准路径。`,
    detailEn: customGateway
      ? `This is treated as a ${providerLabelEn} gateway. Verify path, CORS, and auth forwarding.`
      : `Detected as a standard ${providerLabelEn} endpoint.`,
    checklist,
    modelFallbackActive,
    modelFallbackZh: modelFallbackActive
      ? `如果模型列表不可用，当前手动模型名「${model}」仍会用于实际 AI 请求。`
      : '如果模型列表不可用，可在下方手动填写模型名作为兜底。',
    modelFallbackEn: modelFallbackActive
      ? `If model listing is unavailable, the manual model "${model}" will still be used for AI requests.`
      : 'If model listing is unavailable, enter a model manually below as fallback.',
  }
}

export const buildNetworkPresetSaveGuidance = (apiSettings = {}) => {
  const endpoint = buildNetworkEndpointGuidance(apiSettings)
  const hasKey = Boolean(normalizeText(apiSettings.key))
  const hasModel = Boolean(normalizeText(apiSettings.model))
  const blocking = []
  const warnings = []
  const confirmations = []

  if (!endpoint.validHttpUrl) {
    blocking.push({
      id: 'url',
      textZh: '接口地址格式仍需修正，建议先不要保存为预设。',
      textEn: 'Endpoint format still needs fixing; avoid saving it as a preset yet.',
    })
  }

  if (!hasKey) {
    blocking.push({
      id: 'key',
      textZh: '缺少 API Key，保存后无法直接用于连接测试。',
      textEn: 'API key is missing, so the preset cannot be tested directly after saving.',
    })
  }

  if (endpoint.customGateway) {
    warnings.push({
      id: 'custom_gateway',
      textZh: '这是自定义网关预设，请确认 CORS 与鉴权转发稳定。',
      textEn: 'This is a custom gateway preset. Confirm CORS and auth forwarding are stable.',
    })
  }

  if (endpoint.validHttpUrl && !endpoint.pathLooksOk) {
    warnings.push({
      id: 'path',
      textZh: '接口路径看起来不是标准路径，保存前建议先测试连接。',
      textEn: 'Endpoint path does not look standard; test the connection before saving.',
    })
  }

  if (hasKey) {
    confirmations.push({
      id: 'key_storage',
      textZh: 'Key 会随预设保存在本地浏览器配置中；不要在共享设备上保存真实生产 Key。',
      textEn: 'The key is stored with the preset in local browser settings. Do not save production keys on shared devices.',
    })
  }

  if (hasModel) {
    confirmations.push({
      id: 'manual_model',
      textZh: '当前模型名会随预设保存；模型列表不可用时会作为手动兜底使用。',
      textEn: 'The current model name is saved with the preset and used as manual fallback when model listing is unavailable.',
    })
  } else {
    warnings.push({
      id: 'model',
      textZh: '当前没有模型名；如果供应商模型列表不可用，保存后仍需手动补模型。',
      textEn: 'No model is set. If provider model listing is unavailable, you still need to add a model manually after saving.',
    })
  }

  const tone = blocking.length > 0 ? 'error' : warnings.length > 0 ? 'warn' : 'success'

  return {
    visible: endpoint.visible || hasKey || hasModel,
    tone,
    canSaveCleanly: blocking.length === 0,
    blocking,
    warnings,
    confirmations,
    titleZh:
      tone === 'error'
        ? '预设保存前还需修正'
        : tone === 'warn'
          ? '预设可保存，但建议先确认'
          : '预设保存信息完整',
    titleEn:
      tone === 'error'
        ? 'Preset needs fixes before saving'
        : tone === 'warn'
          ? 'Preset can be saved, but review first'
          : 'Preset is ready to save',
    detailZh:
      tone === 'error'
        ? '建议先补齐必需项，避免保存一个无法复用的配置。'
        : tone === 'warn'
          ? '保存不会被阻止，但这些信息会影响后续复用稳定性。'
          : 'URL、Key 与模型兜底信息已具备，可作为可复用配置保存。',
    detailEn:
      tone === 'error'
        ? 'Fix required items first to avoid saving an unusable configuration.'
        : tone === 'warn'
          ? 'Saving is allowed, but these details affect reuse stability.'
          : 'Endpoint, key, and model fallback are ready for a reusable preset.',
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
