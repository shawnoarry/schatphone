const OPENAI_DEFAULT_CHAT_URL = 'https://api.openai.com/v1/chat/completions'
const OPENAI_DEFAULT_MODEL = 'gpt-4o-mini'
const GEMINI_DEFAULT_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta'
const GEMINI_DEFAULT_MODEL = 'gemini-2.5-flash'
const MODELS_REQUEST_TIMEOUT_MS = 12000
const CHAT_REQUEST_TIMEOUT_MS = 30000
const MAX_IMAGE_REFERENCES = 3
const MAX_IMAGE_REFERENCE_DATA_URL_CHARS = 2_200_000
const IMAGE_REFERENCE_MODE_AUTO = 'auto'
const IMAGE_REFERENCE_MODE_CONTEXT_ONLY = 'context_only'
const IMAGE_REFERENCE_MODE_NATIVE_URL = 'native_url'

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
  const externalSignal = options?.signal
  const controller = new AbortController()
  const timerId = setTimeout(() => controller.abort(), timeoutMs)
  let externalAbortListener = null

  if (externalSignal) {
    if (externalSignal.aborted) {
      controller.abort()
    } else {
      externalAbortListener = () => controller.abort()
      externalSignal.addEventListener('abort', externalAbortListener, { once: true })
    }
  }

  try {
    const mergedOptions = { ...options }
    delete mergedOptions.signal
    return await fetch(url, {
      ...mergedOptions,
      signal: controller.signal,
    })
  } finally {
    clearTimeout(timerId)
    if (externalSignal && externalAbortListener) {
      externalSignal.removeEventListener('abort', externalAbortListener)
    }
  }
}

const ensureUrl = (url, fallbackUrl) => {
  const normalized = normalizeUrl(url)
  if (!normalized) return new URL(fallbackUrl)
  return new URL(normalized)
}

const trimSingleLine = (value, max = 120) => {
  if (typeof value !== 'string') return ''
  const normalized = value.trim().replace(/\s+/g, ' ')
  if (!normalized) return ''
  return normalized.slice(0, max)
}

const sanitizeHttpUrl = (value) => {
  if (typeof value !== 'string') return ''
  const normalized = value.trim()
  if (!normalized) return ''
  try {
    const parsed = new URL(normalized)
    const protocol = parsed.protocol.toLowerCase()
    if (protocol !== 'http:' && protocol !== 'https:') return ''
    return parsed.href
  } catch {
    return ''
  }
}

const sanitizeImageReferenceUrl = (value) => {
  if (typeof value !== 'string') return ''
  const normalized = value.trim()
  if (!normalized) return ''

  const httpUrl = sanitizeHttpUrl(normalized)
  if (httpUrl) return httpUrl

  if (normalized.length > MAX_IMAGE_REFERENCE_DATA_URL_CHARS) return ''
  if (!/^data:image\/[a-z0-9.+-]+;base64,[a-z0-9+/=\s]+$/i.test(normalized)) return ''
  return normalized
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
  if (code === 'CANCELED') return '请求已取消。'
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

export const normalizeImageReferences = (input = []) =>
  (Array.isArray(input) ? input : [])
    .map((item) => {
      const record = item && typeof item === 'object' ? item : {}
      const label = trimSingleLine(record.label || record.alt || record.name || 'Image')
      const note = trimSingleLine(record.note || record.caption || '', 200)
      const sourceUrl = sanitizeImageReferenceUrl(record.sourceUrl || record.url || '')
      const assetId = trimSingleLine(record.assetId || '', 64)
      if (!label && !note && !sourceUrl) return null
      return {
        label: label || 'Image',
        note,
        sourceUrl,
        assetId,
      }
    })
    .filter(Boolean)
    .slice(0, MAX_IMAGE_REFERENCES)

export const buildImageReferenceContextText = (input = []) => {
  const references = normalizeImageReferences(input)
  if (!references.length) return ''

  const lines = [
    '[Reference Images]',
    'Use the following image cues when generating your reply:',
  ]
  references.forEach((item, index) => {
    const parts = [`${index + 1}) ${item.label}`]
    if (item.note) parts.push(`note: ${item.note}`)
    if (item.sourceUrl) parts.push(`url: ${item.sourceUrl}`)
    if (item.assetId) parts.push(`assetId: ${item.assetId}`)
    lines.push(parts.join(' | '))
  })
  return lines.join('\n')
}

const appendImageContextToMessages = (messages, imageReferences) => {
  const list = Array.isArray(messages) ? messages.map((item) => ({ ...item })) : []
  const contextText = buildImageReferenceContextText(imageReferences)
  if (!contextText) return list

  let lastUserIndex = -1
  for (let i = list.length - 1; i >= 0; i -= 1) {
    if (list[i]?.role === 'user') {
      lastUserIndex = i
      break
    }
  }

  if (lastUserIndex < 0) {
    list.push({
      role: 'user',
      content: contextText,
    })
    return list
  }

  const current = list[lastUserIndex]
  const baseText =
    typeof current.content === 'string' && current.content.trim()
      ? current.content.trim()
      : 'Please use the image references below.'
  list[lastUserIndex] = {
    ...current,
    content: `${baseText}\n\n${contextText}`,
  }
  return list
}

const buildOpenAiNativeImageMessages = (messages, imageReferences) => {
  const list = Array.isArray(messages) ? messages.map((item) => ({ ...item })) : []
  const references = normalizeImageReferences(imageReferences).filter((item) => item.sourceUrl)
  if (!references.length) return null

  let lastUserIndex = -1
  for (let i = list.length - 1; i >= 0; i -= 1) {
    if (list[i]?.role === 'user') {
      lastUserIndex = i
      break
    }
  }
  if (lastUserIndex < 0) return null

  const target = list[lastUserIndex]
  const baseText =
    typeof target?.content === 'string' && target.content.trim()
      ? target.content.trim()
      : 'Use the attached reference images to guide visual details.'

  const content = [
    {
      type: 'text',
      text: `${baseText}\n\nUse attached reference images for visual cues when relevant.`,
    },
    ...references.map((item) => ({
      type: 'image_url',
      image_url: {
        url: item.sourceUrl,
      },
    })),
  ]

  list[lastUserIndex] = {
    ...target,
    content,
  }
  return list
}

const isNativeImageFallbackStatus = (status) =>
  status === 400 || status === 404 || status === 415 || status === 422

export const getAiProviderCapabilities = ({ settings, imageReferences = [] } = {}) => {
  const kind = detectApiKindFromUrl(settings?.api?.url)
  const references = normalizeImageReferences(imageReferences)
  const nativeUrlReferenceCount = references.filter((item) => item.sourceUrl).length
  const supportsNativeImageReference = kind === 'openai_compatible'
  const preferredImageReferenceMode =
    supportsNativeImageReference && nativeUrlReferenceCount > 0
      ? IMAGE_REFERENCE_MODE_NATIVE_URL
      : references.length > 0
        ? IMAGE_REFERENCE_MODE_CONTEXT_ONLY
        : 'none'

  return {
    kind,
    referenceCount: references.length,
    nativeUrlReferenceCount,
    supportsNativeImageReference,
    preferredImageReferenceMode,
    supportedImageReferenceModes: supportsNativeImageReference
      ? [IMAGE_REFERENCE_MODE_CONTEXT_ONLY, IMAGE_REFERENCE_MODE_NATIVE_URL]
      : [IMAGE_REFERENCE_MODE_CONTEXT_ONLY],
  }
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

const buildCallPayload = (text, meta, withMeta = false) => (withMeta ? { text, meta } : text)

export async function callAI({
  messages,
  systemPrompt,
  settings,
  signal,
  imageReferences = [],
  imageReferenceMode = IMAGE_REFERENCE_MODE_AUTO,
  withMeta = false,
}) {
  const key = settings.api.key?.trim()
  if (!key) {
    throw createApiError('No API Key', 'NO_API_KEY')
  }

  const apiKind = detectApiKindFromUrl(settings.api.url)
  settings.api.resolvedKind = apiKind

  try {
    const normalizedReferences = normalizeImageReferences(imageReferences)
    const providerCapabilities = getAiProviderCapabilities({
      settings,
      imageReferences: normalizedReferences,
    })
    const requestedImageReferenceMode =
      imageReferenceMode === IMAGE_REFERENCE_MODE_NATIVE_URL ||
      imageReferenceMode === IMAGE_REFERENCE_MODE_CONTEXT_ONLY
        ? imageReferenceMode
        : IMAGE_REFERENCE_MODE_AUTO
    const resolvedImageReferenceMode =
      normalizedReferences.length === 0
        ? 'none'
        : requestedImageReferenceMode === IMAGE_REFERENCE_MODE_CONTEXT_ONLY
          ? IMAGE_REFERENCE_MODE_CONTEXT_ONLY
          : providerCapabilities.preferredImageReferenceMode
    const executionMeta = {
      apiKind,
      requestedImageReferenceMode,
      resolvedImageReferenceMode,
      providerPreferredImageReferenceMode: providerCapabilities.preferredImageReferenceMode || 'none',
      referenceCount: normalizedReferences.length,
      nativeUrlReferenceCount: providerCapabilities.nativeUrlReferenceCount,
      nativeAttempted: false,
      fallbackUsed: false,
      finalTransportMode:
        resolvedImageReferenceMode === IMAGE_REFERENCE_MODE_NATIVE_URL
          ? IMAGE_REFERENCE_MODE_NATIVE_URL
          : resolvedImageReferenceMode === IMAGE_REFERENCE_MODE_CONTEXT_ONLY
            ? IMAGE_REFERENCE_MODE_CONTEXT_ONLY
            : 'none',
    }
    const baseMessages = Array.isArray(messages) ? messages : []
    const contextEnhancedMessages =
      resolvedImageReferenceMode === 'none'
        ? baseMessages
        : appendImageContextToMessages(baseMessages, normalizedReferences)

    if (apiKind === 'gemini') {
      const url = `${toGeminiGenerateUrl(settings.api.url, settings.api.model)}?key=${encodeURIComponent(key)}`

      const geminiContents = contextEnhancedMessages.map((message) => ({
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

      const response = await fetchWithTimeout(
        url,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal,
        },
        CHAT_REQUEST_TIMEOUT_MS,
      )

      if (!response.ok) {
        throw createApiError(
          `Gemini API Request Failed: ${response.status}`,
          classifyHttpCode(response.status),
          { status: response.status },
        )
      }

      let data
      try {
        data = await response.json()
      } catch {
        throw createApiError('Gemini API invalid JSON', 'PARSE_ERROR')
      }
      executionMeta.finalTransportMode =
        normalizedReferences.length > 0 ? IMAGE_REFERENCE_MODE_CONTEXT_ONLY : 'none'
      return buildCallPayload(data.candidates?.[0]?.content?.parts?.[0]?.text || '', executionMeta, withMeta)
    }

    const url = toOpenAIChatUrl(settings.api.url)
    const requestOpenAi = async (bodyMessages) => {
      const payload = {
        model: settings.api.model || OPENAI_DEFAULT_MODEL,
        messages: [{ role: 'system', content: systemPrompt }, ...bodyMessages],
        temperature: 0.7,
        stream: false,
      }
      return fetchWithTimeout(
        url,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${key}`,
          },
          body: JSON.stringify(payload),
          signal,
        },
        CHAT_REQUEST_TIMEOUT_MS,
      )
    }

    const nativeMessages =
      resolvedImageReferenceMode === IMAGE_REFERENCE_MODE_NATIVE_URL
        ? buildOpenAiNativeImageMessages(baseMessages, normalizedReferences)
        : null
    if (nativeMessages) {
      executionMeta.nativeAttempted = true
      executionMeta.finalTransportMode = IMAGE_REFERENCE_MODE_NATIVE_URL
    } else if (normalizedReferences.length > 0) {
      executionMeta.finalTransportMode = IMAGE_REFERENCE_MODE_CONTEXT_ONLY
    }

    let response = await requestOpenAi(nativeMessages || contextEnhancedMessages)
    if (
      !response.ok &&
      nativeMessages &&
      isNativeImageFallbackStatus(response.status)
    ) {
      executionMeta.fallbackUsed = true
      executionMeta.finalTransportMode = IMAGE_REFERENCE_MODE_CONTEXT_ONLY
      response = await requestOpenAi(contextEnhancedMessages)
    }

    if (!response.ok) {
      throw createApiError(
        `API Request Failed: ${response.status}`,
        classifyHttpCode(response.status),
        { status: response.status },
      )
    }

    let data
    try {
      data = await response.json()
    } catch {
      throw createApiError('OpenAI API invalid JSON', 'PARSE_ERROR')
    }
    return buildCallPayload(data.choices?.[0]?.message?.content || '', executionMeta, withMeta)
  } catch (error) {
    if (error?.code) throw error

    if (error instanceof TypeError && error.message.includes('Invalid URL')) {
      throw createApiError('Invalid URL', 'INVALID_URL')
    }
    if (isAbortError(error)) {
      if (signal?.aborted) {
        throw createApiError('Request canceled', 'CANCELED')
      }
      throw createApiError('Request timeout', 'TIMEOUT')
    }
    if (error instanceof TypeError) {
      throw createApiError('Network error', 'NETWORK')
    }
    throw createApiError(error?.message || 'API Request Failed', 'UNKNOWN')
  }
}
