import { detectApiKindFromUrl, requiresApiKeyForUrl } from './ai'

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

const isLocalEndpoint = (parsed) => {
  const host = parsed?.hostname?.toLowerCase() || ''
  return host === 'localhost' || host === '127.0.0.1' || host === '::1' || host === '[::1]'
}

const getProviderLabels = (kind) => {
  if (kind === 'gemini') return { providerLabelZh: 'Gemini', providerLabelEn: 'Gemini' }
  if (kind === 'anthropic') return { providerLabelZh: 'Anthropic', providerLabelEn: 'Anthropic' }
  if (kind === 'azure_openai' || kind === 'azure_openai_responses') {
    return { providerLabelZh: 'Azure OpenAI', providerLabelEn: 'Azure OpenAI' }
  }
  if (kind === 'openai_responses') {
    return { providerLabelZh: 'OpenAI Responses', providerLabelEn: 'OpenAI Responses' }
  }
  return { providerLabelZh: 'OpenAI 兼容', providerLabelEn: 'OpenAI-compatible' }
}

const openAiCompatiblePathLooksOk = (path) => {
  if (!path || path === '/') return true
  if (path === '/v1' || path.endsWith('/v1')) return true
  if (path.endsWith('/models')) return true
  if (path.endsWith('/chat/completions')) return true
  if (path.endsWith('/responses')) return true
  if (path.endsWith('/completions')) return true
  if (path.endsWith('/api/chat') || path.endsWith('/api/generate') || path.endsWith('/api/tags')) return true
  if (path.endsWith('/openai') || path.endsWith('/openai/v1')) return true
  if (path.includes('/openai/') && (path.endsWith('/models') || path.endsWith('/chat/completions'))) return true
  return false
}

const geminiPathLooksOk = (path, officialGemini) => {
  if (officialGemini && (!path || path === '/')) return true
  return path.includes('/v1beta') || path.includes('/v1') || path.includes(':generatecontent')
}

const anthropicPathLooksOk = (path) => {
  if (!path || path === '/') return true
  return path === '/v1' || path.endsWith('/v1') || path.endsWith('/messages') || path.endsWith('/models')
}

const azureOpenAiPathLooksOk = (path) => {
  if (!path || path === '/') return true
  if (path === '/openai' || path.endsWith('/openai')) return true
  if (path.endsWith('/deployments')) return true
  if (path.includes('/deployments/') && path.endsWith('/chat/completions')) return true
  if (path.includes('/deployments/') && path.endsWith('/responses')) return true
  return false
}

const pathLooksOkForKind = (kind, path, officialGemini) => {
  if (kind === 'gemini') return geminiPathLooksOk(path, officialGemini)
  if (kind === 'anthropic') return anthropicPathLooksOk(path)
  if (kind === 'azure_openai' || kind === 'azure_openai_responses') return azureOpenAiPathLooksOk(path)
  if (kind === 'openai_responses') return openAiCompatiblePathLooksOk(path)
  return openAiCompatiblePathLooksOk(path)
}

const getEndpointPathTextEn = (kind) => {
  if (kind === 'gemini') {
    return 'Gemini native URLs can be a root URL, /v1beta, /v1, or models/generateContent path; generation derives the model path.'
  }
  if (kind === 'anthropic') {
    return 'Anthropic URLs can be a root URL, /v1, /messages, or /models; requests use the native Messages API.'
  }
  if (kind === 'azure_openai' || kind === 'azure_openai_responses') {
    return 'Azure OpenAI URLs should include /openai/deployments/{deployment}/chat/completions or /responses, plus api-version.'
  }
  if (kind === 'openai_responses') {
    return 'OpenAI Responses URLs can be a root URL, /v1, /responses, /models, or /chat/completions; calls use the Responses API.'
  }
  return 'OpenAI-compatible URLs can be a root URL, /v1, /models, /chat/completions, or local Ollama-style /api/chat paths.'
}

const getEndpointAuthTextEn = (kind, keyRequired, keyProvided) => {
  if (kind === 'gemini') return 'Gemini native endpoints require a Google API key, sent as a query parameter.'
  if (kind === 'anthropic') return 'Anthropic official endpoints require x-api-key authentication.'
  if (kind === 'azure_openai' || kind === 'azure_openai_responses') return 'Azure OpenAI endpoints require an api-key header.'
  if (keyRequired) return 'Official endpoints require Bearer token auth, so add an API key.'
  if (keyProvided) {
    return 'This compatible endpoint will receive a Bearer token. Leave it blank if the gateway does not need one.'
  }
  return 'This compatible endpoint can be tested without a key. Add one only if the gateway requires auth.'
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
  const keyRequired = hasUrl ? requiresApiKeyForUrl(url) : true
  const hasKey = keyRequired ? Boolean(key) : true
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
    keyRequired,
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
  const { providerLabelZh, providerLabelEn } = getProviderLabels(detectedKind)

  if (state.nextStep === 'url') {
    return {
      titleZh: '先填写接口 URL',
      titleEn: 'Enter an endpoint URL first',
      detailZh: '可以粘贴基础地址、模型列表地址或对话接口地址，也可以从已保存配置下拉载入。',
      detailEn: 'Paste a base URL, model-list URL, or chat endpoint, or load one from saved configurations.',
      actionZh: '填写 URL',
      actionEn: 'Enter URL',
      tone: 'warn',
      providerLabelZh,
      providerLabelEn,
    }
  }

  if (state.nextStep === 'key') {
    return {
      titleZh: '继续填写 API Key',
      titleEn: 'Paste the API key next',
      detailZh: `当前识别为 ${providerLabelZh}，这个地址通常需要 Key 才能测试。`,
      detailEn: `Detected as ${providerLabelEn}. This endpoint usually needs a key before testing.`,
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
    detailZh: state.keyRequired
      ? '点击刷新模型列表来确认 URL、Key 与模型接口是否可用。'
      : '这个地址可无 Key 测试；点击刷新模型列表确认 URL 与模型接口是否可用。',
    detailEn: state.keyRequired
      ? 'Refresh models to verify the endpoint, key, and model API.'
      : 'This endpoint can be tested without a key. Refresh models to verify the URL and model API.',
    actionZh: '测试连接',
    actionEn: 'Test connection',
    tone: 'success',
    providerLabelZh,
    providerLabelEn,
  }
}

export const buildNetworkEndpointGuidance = (apiSettings = {}) => {
  const url = normalizeText(apiSettings.url)
  const key = normalizeText(apiSettings.key)
  const model = normalizeText(apiSettings.model)
  const kind = detectApiKindFromUrl(url)
  const { providerLabelZh, providerLabelEn } = getProviderLabels(kind)
  const parsed = parseHttpUrl(url)
  const host = parsed?.hostname?.toLowerCase() || ''
  const path = parsed?.pathname?.replace(/\/+$/, '').toLowerCase() || ''
  const validHttpUrl = Boolean(parsed)
  const officialOpenAi = host === 'api.openai.com'
  const officialGemini = host === 'generativelanguage.googleapis.com'
  const officialAnthropic = host === 'api.anthropic.com'
  const officialAzureOpenAi = host.endsWith('.openai.azure.com')
  const officialProvider =
    kind === 'gemini'
      ? officialGemini
      : kind === 'anthropic'
        ? officialAnthropic
        : kind === 'azure_openai' || kind === 'azure_openai_responses'
          ? officialAzureOpenAi
          : officialOpenAi || (officialGemini && path.includes('/openai'))
  const localEndpoint = isLocalEndpoint(parsed)
  const customGateway = validHttpUrl && !officialProvider
  const keyRequired = validHttpUrl ? requiresApiKeyForUrl(url) : true
  const keyProvided = Boolean(key)
  const pathLooksOk = validHttpUrl ? pathLooksOkForKind(kind, path, officialGemini) : false

  const checklist = []

  if (!url) {
    return {
      visible: false,
      kind,
      providerLabelZh,
      providerLabelEn,
      validHttpUrl: false,
      customGateway: false,
      localEndpoint: false,
      keyRequired: true,
      keyProvided: false,
      pathLooksOk: false,
      tone: 'neutral',
      titleZh: '等待接口地址',
      titleEn: 'Waiting for endpoint',
      detailZh: '填写或载入 API URL 后，会显示路径、鉴权和网关检查。',
      detailEn: 'Enter or load an API URL to see path, auth, and gateway checks.',
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
      localEndpoint: false,
      keyRequired: true,
      keyProvided,
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
    tone: parsed.protocol === 'https:' || localEndpoint ? 'success' : 'warn',
    textZh:
      parsed.protocol === 'https:'
        ? '已使用 HTTPS。'
        : localEndpoint
          ? '本地 HTTP 地址可用于本机模型或内网调试。'
          : '当前是 HTTP，仅建议用于 localhost 或内网调试。',
    textEn:
      parsed.protocol === 'https:'
        ? 'HTTPS is enabled.'
        : localEndpoint
          ? 'Local HTTP is acceptable for local models or internal testing.'
          : 'HTTP should only be used for localhost or internal testing.',
  })

  checklist.push({
    id: 'path',
    tone: pathLooksOk ? 'success' : 'warn',
    textZh:
      kind === 'gemini'
        ? 'Gemini 原生 URL 可填写根地址、/v1beta、/v1 或 models/generateContent 路径，生成请求会自动拼接模型路径。'
        : 'OpenAI 兼容 URL 可填写根地址、/v1、/models、/chat/completions、/responses，或本地 Ollama /api/chat 等常见路径。',
    textEn:
      getEndpointPathTextEn(kind),
  })

  checklist.push({
    id: 'cors',
    tone: customGateway && !localEndpoint ? 'warn' : 'success',
    textZh:
      customGateway && !localEndpoint
        ? '自定义网关需要允许当前站点跨域访问，否则浏览器会报网络/CORS 错误。'
        : localEndpoint
          ? '本地服务仍需允许浏览器跨域访问当前站点。'
          : '官方或标准路径已识别；如果浏览器环境受限，可改用允许跨域的网关。',
    textEn:
      customGateway && !localEndpoint
        ? 'Custom gateways must allow CORS from this app, otherwise the browser reports network/CORS errors.'
        : localEndpoint
          ? 'The local service still needs to allow browser CORS from this app.'
          : 'Official or standard endpoint detected. If the browser environment blocks it, use a CORS-enabled gateway.',
  })

  checklist.push({
    id: 'auth',
    tone: keyRequired && !keyProvided ? 'warn' : 'success',
    textZh:
      kind === 'gemini'
        ? 'Gemini 原生接口需要 Google API Key，并会把 Key 作为查询参数发送。'
        : keyRequired
          ? '官方接口需要 Bearer token 鉴权，请填写 API Key。'
          : keyProvided
            ? '这个兼容地址会携带 Bearer token；如果网关不需要 Key，也可以留空。'
            : '这个兼容地址可无 Key 测试；如果网关要求鉴权，再填写对应 Key。',
    textEn:
      getEndpointAuthTextEn(kind, keyRequired, keyProvided),
  })

  const modelFallbackActive = Boolean(model)
  const tone = !pathLooksOk ? 'warn' : customGateway && !localEndpoint ? 'warn' : 'success'
  return {
    visible: true,
    kind,
    providerLabelZh,
    providerLabelEn,
    validHttpUrl,
    customGateway,
    localEndpoint,
    keyRequired,
    keyProvided,
    pathLooksOk,
    tone,
    titleZh: localEndpoint ? '本地接口检查' : customGateway ? '自定义网关检查' : '供应商接口检查',
    titleEn: localEndpoint ? 'Local endpoint check' : customGateway ? 'Custom gateway check' : 'Provider endpoint check',
    detailZh: localEndpoint
      ? `当前按 ${providerLabelZh} 本地/内网接口处理，请确认服务已启动并允许浏览器访问。`
      : customGateway
        ? `当前按 ${providerLabelZh} 网关处理，请重点确认路径、CORS 与鉴权转发。`
        : `当前识别为 ${providerLabelZh} 官方/标准路径。`,
    detailEn: localEndpoint
      ? `This is treated as a local/internal ${providerLabelEn} endpoint. Confirm the service is running and browser-accessible.`
      : customGateway
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
  const keyRequired = endpoint.keyRequired !== false
  const blocking = []
  const warnings = []
  const confirmations = []

  if (!endpoint.validHttpUrl) {
    blocking.push({
      id: 'url',
      textZh: '接口地址格式仍需修正，建议先不要保存为配置。',
      textEn: 'Endpoint format still needs fixing; avoid saving it as a configuration yet.',
    })
  }

  if (!hasKey && keyRequired) {
    blocking.push({
      id: 'key',
      textZh: '缺少 API Key，保存后无法直接用于官方接口连接测试。',
      textEn: 'API key is missing, so this configuration cannot directly test official endpoints.',
    })
  }

  if (endpoint.customGateway && !endpoint.localEndpoint) {
    warnings.push({
      id: 'custom_gateway',
      textZh: '这是自定义网关配置，请确认 CORS 与鉴权转发稳定。',
      textEn: 'This is a custom gateway configuration. Confirm CORS and auth forwarding are stable.',
    })
  }

  if (!hasKey && endpoint.validHttpUrl && !keyRequired) {
    confirmations.push({
      id: 'no_key_required',
      textZh: '这个兼容地址可不保存 Key，适合本地模型或由网关侧完成鉴权的配置。',
      textEn: 'This compatible endpoint can be saved without a key, useful for local models or server-auth gateways.',
    })
  }

  if (endpoint.validHttpUrl && !endpoint.pathLooksOk) {
    warnings.push({
      id: 'path',
      textZh: '接口路径不是常见可换算路径，保存前建议先测试连接。',
      textEn: 'Endpoint path is not a common adapter path; test the connection before saving.',
    })
  }

  if (hasKey) {
    confirmations.push({
      id: 'key_storage',
      textZh: 'Key 会随配置保存在本地浏览器设置中；不要在共享设备上保存真实生产 Key。',
      textEn: 'The key is stored with the configuration in local browser settings. Do not save production keys on shared devices.',
    })
  }

  if (hasModel) {
    confirmations.push({
      id: 'manual_model',
      textZh: '当前模型名会随配置保存；模型列表不可用时会作为手动兜底使用。',
      textEn: 'The current model name is saved with the configuration and used as manual fallback when model listing is unavailable.',
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
        ? '配置保存前还需修正'
        : tone === 'warn'
          ? '配置可保存，但建议先确认'
          : '配置保存信息完整',
    titleEn:
      tone === 'error'
        ? 'Configuration needs fixes before saving'
        : tone === 'warn'
          ? 'Configuration can be saved, but review first'
          : 'Configuration is ready to save',
    detailZh:
      tone === 'error'
        ? '建议先补齐必需项，避免保存一个无法复用的配置。'
        : tone === 'warn'
          ? '保存不会被阻止，但这些信息会影响后续复用稳定性。'
          : 'URL、鉴权方式与模型兜底信息已具备，可作为可复用配置保存。',
    detailEn:
      tone === 'error'
        ? 'Fix required items first to avoid saving an unusable configuration.'
        : tone === 'warn'
          ? 'Saving is allowed, but these details affect reuse stability.'
          : 'Endpoint, auth mode, and model fallback are ready for a reusable configuration.',
  }
}

export const buildNetworkFailureGuidance = (error = {}, apiSettings = {}) => {
  const url = normalizeText(apiSettings.url)
  const model = normalizeText(apiSettings.model)
  const detectedKind = detectApiKindFromUrl(url)
  const { providerLabelZh, providerLabelEn } = getProviderLabels(detectedKind)
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
      detailZh: '请先输入完整 API URL，或从已保存的 API 配置下拉载入。',
      detailEn: 'Enter the full API endpoint URL, or load one from saved API configurations.',
      fixZh: '可填写基础地址、/v1、/models、/chat/completions、Gemini /v1beta，或本地模型服务地址。',
      fixEn: 'Use a base URL, /v1, /models, /chat/completions, Gemini /v1beta, or a local model service URL.',
    }
  }

  if (code === 'NO_API_KEY') {
    return {
      ...base,
      titleZh: 'API Key 缺失',
      titleEn: 'API key is missing',
      detailZh: `当前识别为 ${providerLabelZh}，但这个地址需要 Key 才能测试。`,
      detailEn: `Detected as ${providerLabelEn}, but this endpoint needs a key for testing.`,
      fixZh: '粘贴供应商后台生成的 Key；如果是自建网关，也可改用由网关侧完成鉴权的兼容地址。',
      fixEn: 'Paste the key generated by the provider. For custom gateways, you can also use a server-auth compatible endpoint.',
    }
  }

  if (code === 'INVALID_URL') {
    return {
      ...base,
      titleZh: '接口地址格式不正确',
      titleEn: 'Endpoint URL is invalid',
      detailZh: '浏览器无法解析当前 URL，因此请求还没有真正发出。',
      detailEn: 'The browser cannot parse the current URL, so the request was not sent.',
      fixZh: '检查是否缺少 https://、域名或路径；也可以粘贴一个已知可用的基础地址或接口地址。',
      fixEn: 'Check for missing https://, domain, or path. Paste a known working base URL or endpoint if available.',
    }
  }

  if (code === 'AUTH') {
    return {
      ...base,
      titleZh: '鉴权失败',
      titleEn: 'Authentication failed',
      detailZh: `供应商返回 ${statusCode || '401/403'}，通常是 Key 无效、权限不足或项目未启用。`,
      detailEn: `Provider returned ${statusCode || '401/403'}, usually because the key is invalid, lacks permission, or the project is disabled.`,
      fixZh: '重新生成 Key，并确认余额、权限和模型访问已开启；Gemini 需确认 API Key 属于目标 Google 项目。',
      fixEn: 'Regenerate the key and verify billing, permissions, and model access. For Gemini, confirm the key belongs to the target Google project.',
    }
  }

  if (code === 'NOT_FOUND') {
    return {
      ...base,
      titleZh: '接口路径不存在',
      titleEn: 'Endpoint path was not found',
      detailZh: `供应商返回 ${statusCode || 404}，通常是 URL 路径或网关转发路径不匹配。`,
      detailEn: `Provider returned ${statusCode || 404}, usually because the endpoint path or gateway route is wrong.`,
      fixZh: '可尝试基础地址、/v1、/v1/models、/v1/chat/completions、Gemini /v1beta，或 Ollama/本地服务的 /v1 兼容接口。',
      fixEn: 'Try a base URL, /v1, /v1/models, /v1/chat/completions, Gemini /v1beta, or the /v1-compatible path for Ollama/local services.',
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
