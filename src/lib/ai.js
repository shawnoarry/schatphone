const OPENAI_DEFAULT_CHAT_URL = 'https://api.openai.com/v1/chat/completions'
const OPENAI_DEFAULT_MODEL = 'gpt-4o-mini'
const GEMINI_DEFAULT_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta'
const GEMINI_DEFAULT_MODEL = 'gemini-2.5-flash'
const MODELS_REQUEST_TIMEOUT_MS = 12000

const normalizeUrl = (url) => (url || '').trim()
const isAbortError = (error) => error?.name === 'AbortError'

const createApiError = (message, code, extra = {}) => {
  const error = new Error(message)
  error.code = code
  Object.assign(error, extra)
  return error
}

const classifyHttpCode = (status) => {
  if (status === 401 || status === 403) return 'AUTH'
  if (status === 404) return 'NOT_FOUND'
  if (status === 429) return 'RATE_LIMIT'
  if (status >= 500) return 'SERVER'
  return 'HTTP_ERROR'
}

const fetchWithTimeout = async (url, options = {}, timeoutMs = MODELS_REQUEST_TIMEOUT_MS) => {
  const controller = new AbortController()
  const timerId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    })
  } finally {
    clearTimeout(timerId)
  }
}

const ensureUrl = (url, fallbackUrl) => {
  const normalized = normalizeUrl(url)
  if (!normalized) return new URL(fallbackUrl)
  return new URL(normalized)
}

export const formatApiErrorForUi = (error, fallbackMessage = '请求失败，请检查设置。') => {
  const code = error?.code
  const status = error?.status

  if (code === 'NO_API_KEY') return '请先填写 API Key。'
  if (code === 'INVALID_URL') return 'URL 格式不正确，请检查后重试。'
  if (code === 'AUTH') return `鉴权失败（${status || '401/403'}），请检查 Key 或权限。`
  if (code === 'NOT_FOUND') return '接口地址不存在（404），请检查 URL 路径。'
  if (code === 'RATE_LIMIT') return '请求过于频繁（429），请稍后重试。'
  if (code === 'SERVER') return `服务端异常（${status || '5xx'}），请稍后再试。`
  if (code === 'TIMEOUT') return '请求超时，请检查网络或网关响应速度。'
  if (code === 'NETWORK') return '网络或跨域错误（可能是 CORS），请检查网关设置。'
  if (code === 'PARSE_ERROR') return '响应解析失败，请确认返回格式是否为 JSON。'
  if (code === 'HTTP_ERROR') return `请求失败（${status || 'unknown'}），请检查 URL 与服务状态。`

  if (typeof error?.message === 'string' && error.message.trim()) return error.message
  return fallbackMessage
}

export const detectApiKindFromUrl = (url) => {
  const lower = normalizeUrl(url).toLowerCase()
  if (!lower) return 'openai_compatible'
  if (lower.includes('generativelanguage.googleapis.com')) return 'gemini'
  if (lower.includes('/v1beta/models') || lower.includes(':generatecontent')) return 'gemini'
  return 'openai_compatible'
}

const toOpenAIChatUrl = (url) => {
  const parsed = ensureUrl(url, OPENAI_DEFAULT_CHAT_URL)
  const path = parsed.pathname.replace(/\/+$/, '')

  if (!path || path === '') {
    parsed.pathname = '/v1/chat/completions'
    return parsed.toString()
  }

  if (path.endsWith('/chat/completions')) {
    return parsed.toString()
  }

  if (path.endsWith('/models')) {
    parsed.pathname = `${path.slice(0, -'/models'.length)}/chat/completions`
    return parsed.toString()
  }

  if (path === '/v1' || path.endsWith('/v1')) {
    parsed.pathname = `${path}/chat/completions`
    return parsed.toString()
  }

  return parsed.toString()
}

const toOpenAIModelsUrl = (url) => {
  const chatUrl = new URL(toOpenAIChatUrl(url))
  const path = chatUrl.pathname.replace(/\/+$/, '')

  if (path.endsWith('/chat/completions')) {
    chatUrl.pathname = `${path.slice(0, -'/chat/completions'.length)}/models`
    return chatUrl.toString()
  }

  if (path.endsWith('/completions')) {
    chatUrl.pathname = `${path.slice(0, -'/completions'.length)}/models`
    return chatUrl.toString()
  }

  if (path === '/v1' || path.endsWith('/v1')) {
    chatUrl.pathname = `${path}/models`
    return chatUrl.toString()
  }

  chatUrl.pathname = '/v1/models'
  return chatUrl.toString()
}

const toGeminiVersionBaseUrl = (url) => {
  const parsed = ensureUrl(url, GEMINI_DEFAULT_BASE_URL)
  const path = parsed.pathname.toLowerCase()

  if (path.includes('/v1beta')) {
    parsed.pathname = '/v1beta'
    parsed.search = ''
    return parsed.toString().replace(/\/+$/, '')
  }

  if (path.includes('/v1')) {
    parsed.pathname = '/v1'
    parsed.search = ''
    return parsed.toString().replace(/\/+$/, '')
  }

  parsed.pathname = '/v1beta'
  parsed.search = ''
  return parsed.toString().replace(/\/+$/, '')
}

const normalizeGeminiModelName = (modelName) => {
  const model = (modelName || '').trim()
  if (!model) return GEMINI_DEFAULT_MODEL
  return model.startsWith('models/') ? model.slice('models/'.length) : model
}

const toGeminiGenerateUrl = (url, modelName) => {
  const versionBaseUrl = toGeminiVersionBaseUrl(url)
  const model = encodeURIComponent(normalizeGeminiModelName(modelName))
  return `${versionBaseUrl}/models/${model}:generateContent`
}

export async function fetchAvailableModels({ settings }) {
  const key = settings.api.key?.trim()
  if (!key) {
    throw createApiError('No API Key', 'NO_API_KEY')
  }

  const kind = detectApiKindFromUrl(settings.api.url)
  try {
    if (kind === 'gemini') {
      const listUrl = `${toGeminiVersionBaseUrl(settings.api.url)}/models?key=${encodeURIComponent(key)}`
      const response = await fetchWithTimeout(listUrl)
      if (!response.ok) {
        throw createApiError(
          `Load models failed: ${response.status}`,
          classifyHttpCode(response.status),
          { status: response.status },
        )
      }

      let payload
      try {
        payload = await response.json()
      } catch {
        throw createApiError('Load models failed: invalid JSON', 'PARSE_ERROR')
      }

      const models = (payload.models || [])
        .map((item) => item?.name)
        .filter(Boolean)
        .map((name) => normalizeGeminiModelName(name))
      return { kind, models }
    }

    const modelsUrl = toOpenAIModelsUrl(settings.api.url)
    const response = await fetchWithTimeout(modelsUrl, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${key}`,
      },
    })
    if (!response.ok) {
      throw createApiError(
        `Load models failed: ${response.status}`,
        classifyHttpCode(response.status),
        { status: response.status },
      )
    }

    let payload
    try {
      payload = await response.json()
    } catch {
      throw createApiError('Load models failed: invalid JSON', 'PARSE_ERROR')
    }

    const models = (payload.data || payload.models || []).map((item) => item?.id || item?.name).filter(Boolean)
    return { kind, models }
  } catch (error) {
    if (error?.code) throw error

    if (error instanceof TypeError && error.message.includes('Invalid URL')) {
      throw createApiError('Invalid URL', 'INVALID_URL')
    }
    if (isAbortError(error)) {
      throw createApiError('Request timeout', 'TIMEOUT')
    }
    if (error instanceof TypeError) {
      throw createApiError('Network error', 'NETWORK')
    }
    throw createApiError(error?.message || 'Load models failed', 'UNKNOWN')
  }
}

export async function callAI({ messages, systemPrompt, settings }) {
  const key = settings.api.key?.trim()
  if (!key) {
    alert('Please configure API Key in Settings > API.')
    throw new Error('No API Key')
  }

  const apiKind = detectApiKindFromUrl(settings.api.url)
  settings.api.resolvedKind = apiKind

  if (apiKind === 'gemini') {
    const url = `${toGeminiGenerateUrl(settings.api.url, settings.api.model)}?key=${encodeURIComponent(key)}`

    const geminiContents = messages.map((message) => ({
      role: message.role === 'user' ? 'user' : 'model',
      parts: [{ text: message.content }],
    }))

    const payload = {
      contents: geminiContents,
      systemInstruction: { parts: [{ text: systemPrompt }] },
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 500,
      },
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      throw new Error(`Gemini API Request Failed: ${response.status}`)
    }

    const data = await response.json()
    return data.candidates?.[0]?.content?.parts?.[0]?.text || ''
  }

  const url = toOpenAIChatUrl(settings.api.url)

  const fullMessages = [{ role: 'system', content: systemPrompt }, ...messages]

  const payload = {
    model: settings.api.model || OPENAI_DEFAULT_MODEL,
    messages: fullMessages,
    temperature: 0.7,
    stream: false,
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const errText = await response.text()
    console.error('OpenAI API Error', errText)
    throw new Error(`API Request Failed: ${response.status}`)
  }

  const data = await response.json()
  return data.choices?.[0]?.message?.content || ''
}
