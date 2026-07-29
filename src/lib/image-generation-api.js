import {
  IMAGE_ADAPTER_KIND,
  inferImageModelCapability,
  isGptImageModelId,
  isGrsaiImageEndpoint,
  isLjqclubImageEndpoint,
  resolveGrsaiGptImageSize,
  resolveImageAdapterKind,
  resolveImageGenerationEndpoint,
  resolveImageModelEndpointCandidates,
  resolveOpenAiImageSize,
  sanitizeImageDiagnosticUrl,
  scaleGeminiImageSize,
} from './image-generation-contract'

const GRS_AI_FALLBACK_MODELS = Object.freeze([
  'nano-banana-2',
  'nano-banana-2-cl',
  'nano-banana-2-4k-cl',
  'nano-banana-pro',
  'nano-banana-pro-vip',
  'gpt-image-2',
  'gpt-image-2-vip',
])

export class ImageGenerationError extends Error {
  constructor(message, code = 'UNKNOWN', details = {}) {
    super(message)
    this.name = 'ImageGenerationError'
    this.code = code
    this.status = Number(details.status) || 0
    this.retryable = details.retryable === true
    this.endpoint = sanitizeImageDiagnosticUrl(details.endpoint)
  }
}

const createHeaders = (apiKey, withJson = true) => {
  const headers = {}
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`
  if (withJson) headers['Content-Type'] = 'application/json'
  return headers
}

const appendProxyToken = (proxyUrl, proxyToken) => {
  try {
    const url = new URL(proxyUrl)
    if (proxyToken) url.searchParams.set('token', proxyToken)
    return url.href
  } catch {
    return ''
  }
}

const parseFailureReason = (value) => {
  if (!value || typeof value !== 'object') return ''
  const direct = value.error || value.message || value.detail
  if (typeof direct === 'string') return direct.slice(0, 320)
  if (direct && typeof direct === 'object') {
    return parseFailureReason(direct)
  }
  return ''
}

const decodeBase64Utf8 = (value) => {
  const binary = atob(value)
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

const readNdjsonResponse = async (response) => {
  const text = await response.text()
  const messages = text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line)
      } catch {
        return null
      }
    })
    .filter(Boolean)
  const failure = messages.find((message) => message.type === 'error')
  if (failure) throw new ImageGenerationError(failure.error || 'Proxy request failed', 'PROXY_ERROR')
  const completed = [...messages].reverse().find((message) => message.type === 'done')
  if (!completed) throw new ImageGenerationError('Proxy response ended before completion', 'PROXY_INCOMPLETE')
  const status = Number(completed.status) || 200
  const body = completed.body ? decodeBase64Utf8(completed.body) : ''
  if (!body.trim()) return {}
  let parsed
  try {
    parsed = JSON.parse(body)
  } catch {
    throw new ImageGenerationError('Proxy returned invalid JSON', 'INVALID_RESPONSE')
  }
  if (status >= 400) {
    const reason = parseFailureReason(parsed) || `HTTP ${status}`
    throw new ImageGenerationError(
      reason,
      status === 401 || status === 403 ? 'AUTH_FAILED' : 'HTTP_ERROR',
      { status, retryable: status >= 500 },
    )
  }
  return parsed
}

const readJsonResponse = async (response, endpoint) => {
  const contentType = response.headers?.get?.('content-type') || ''
  if (contentType.includes('application/x-ndjson')) return readNdjsonResponse(response)
  const text = await response.text()
  let parsed = null
  if (text.trim()) {
    try {
      parsed = JSON.parse(text)
    } catch {
      parsed = null
    }
  }
  if (!response.ok) {
    const reason = parseFailureReason(parsed) || `HTTP ${response.status}`
    throw new ImageGenerationError(reason, response.status === 401 || response.status === 403 ? 'AUTH_FAILED' : 'HTTP_ERROR', {
      status: response.status,
      retryable: response.status >= 500,
      endpoint,
    })
  }
  if (!text.trim()) return {}
  if (!parsed) throw new ImageGenerationError('Provider returned invalid JSON', 'INVALID_RESPONSE', { endpoint })
  return parsed
}

const requestJson = async ({
  endpoint,
  method = 'GET',
  body,
  profile,
  credentials,
  fetchImpl,
  signal,
}) => {
  const headers = createHeaders(credentials.apiKey)
  let target = endpoint
  let init = {
    method,
    headers,
    signal,
    body: method === 'POST' ? JSON.stringify(body || {}) : undefined,
  }
  if (profile.useProxy) {
    const proxyUrl = appendProxyToken(profile.proxyUrl, credentials.proxyToken)
    if (!proxyUrl) throw new ImageGenerationError('Proxy URL is required', 'PROXY_URL_REQUIRED')
    target = proxyUrl
    init = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal,
      body: JSON.stringify({
        target: endpoint,
        method,
        headers,
        body: method === 'POST' ? body || {} : undefined,
        ...(method === 'POST' ? { _vistack_stream: 'ndjson' } : {}),
      }),
    }
  }
  let response
  try {
    response = await fetchImpl(target, init)
  } catch (error) {
    if (error?.name === 'AbortError') throw new ImageGenerationError('Request was cancelled', 'ABORTED')
    throw new ImageGenerationError(
      profile.useProxy
        ? 'Proxy request failed before a response was received'
        : 'Browser request was blocked or the network is unavailable',
      profile.useProxy ? 'PROXY_NETWORK' : 'CORS_OR_NETWORK',
      { retryable: true, endpoint },
    )
  }
  return readJsonResponse(response, endpoint)
}

const referenceToBlob = async (value, fetchImpl) => {
  try {
    const response = await fetchImpl(value)
    if (!response.ok) throw new Error('reference_fetch_failed')
    return response.blob()
  } catch {
    throw new ImageGenerationError('A reference image could not be loaded', 'REFERENCE_UNAVAILABLE')
  }
}

const requestForm = async ({ endpoint, formData, profile, credentials, fetchImpl, signal }) => {
  let target = endpoint
  let body = formData
  if (profile.useProxy) {
    const proxyUrl = appendProxyToken(profile.proxyUrl, credentials.proxyToken)
    if (!proxyUrl) throw new ImageGenerationError('Proxy URL is required', 'PROXY_URL_REQUIRED')
    target = proxyUrl
    formData.append('_vistack_target', endpoint)
    formData.append('_vistack_stream', 'ndjson')
    body = formData
  }
  let response
  try {
    response = await fetchImpl(target, {
      method: 'POST',
      headers: createHeaders(credentials.apiKey, false),
      signal,
      body,
    })
  } catch (error) {
    if (error?.name === 'AbortError') throw new ImageGenerationError('Request was cancelled', 'ABORTED')
    throw new ImageGenerationError('Image edit request could not reach the provider', 'CORS_OR_NETWORK', {
      retryable: true,
      endpoint,
    })
  }
  return readJsonResponse(response, endpoint)
}

const normalizeModelList = (data, endpoint) => {
  const source = Array.isArray(data?.data)
    ? data.data
    : Array.isArray(data?.models)
      ? data.models
      : Array.isArray(data)
        ? data
        : []
  const seen = new Set()
  return source
    .map((item) => {
      const id = typeof item === 'string'
        ? item.trim()
        : [item?.id, item?.model, item?.name, item?.value]
            .find((value) => typeof value === 'string' && value.trim())?.trim() || ''
      if (!id || seen.has(id)) return null
      seen.add(id)
      return {
        id,
        name: typeof item?.name === 'string' && item.name.trim() ? item.name.trim() : id,
        description: typeof item?.description === 'string' ? item.description.trim() : '',
        capability: inferImageModelCapability(id, endpoint),
      }
    })
    .filter(Boolean)
}

export const fetchImageModels = async ({
  profile,
  credentials = {},
  fetchImpl = globalThis.fetch,
  signal,
} = {}) => {
  if (typeof fetchImpl !== 'function') throw new ImageGenerationError('Fetch is unavailable', 'NETWORK_UNAVAILABLE')
  if (!profile?.endpoint) throw new ImageGenerationError('Endpoint is required', 'ENDPOINT_REQUIRED')
  const candidates = resolveImageModelEndpointCandidates(profile.endpoint)
  let lastError = null
  for (const endpoint of candidates) {
    try {
      const data = await requestJson({ endpoint, profile, credentials, fetchImpl, signal })
      const models = normalizeModelList(data, profile.endpoint)
      if (models.length > 0) return { models, source: 'provider', endpoint }
      lastError = new ImageGenerationError('Provider returned an empty model list', 'MODEL_LIST_EMPTY', { endpoint })
    } catch (error) {
      lastError = error
    }
  }
  if (isGrsaiImageEndpoint(profile.endpoint)) {
    return {
      models: GRS_AI_FALLBACK_MODELS.map((id) => ({
        id,
        name: id,
        description: '',
        capability: inferImageModelCapability(id, profile.endpoint),
      })),
      source: 'built_in',
      endpoint: '',
      warning: lastError?.code || 'MODEL_LIST_UNAVAILABLE',
    }
  }
  throw lastError || new ImageGenerationError('Model list is unavailable', 'MODEL_LIST_UNAVAILABLE')
}

const isImageLikeUrl = (value) =>
  typeof value === 'string' && (value.startsWith('data:image/') || /^https?:\/\//i.test(value))

export const extractImageUrls = (input) => {
  const output = []
  const seen = new Set()
  const push = (value, allowAnyHttp = false) => {
    if (typeof value !== 'string') return
    const trimmed = value.trim()
    if (!trimmed) return
    if (trimmed.startsWith('data:image/')) {
      if (!seen.has(trimmed)) output.push(trimmed)
      seen.add(trimmed)
      return
    }
    if (allowAnyHttp && /^https?:\/\//i.test(trimmed)) {
      if (!seen.has(trimmed)) output.push(trimmed)
      seen.add(trimmed)
    }
  }
  const visit = (value, key = '') => {
    if (value == null) return
    if (typeof value === 'string') {
      if (key === 'b64_json' && value.trim()) push(`data:image/png;base64,${value.trim()}`)
      else if (
        [
          'url',
          'urls',
          'image',
          'images',
          'image_url',
          'imageURL',
          'imageUrl',
          'imageUrls',
          'output_url',
          'output',
          'outputs',
          'result',
          'results',
        ].includes(key)
        && /^https?:\/\//i.test(value.trim())
      ) push(value, true)
      else {
        const dataMatch = value.match(/data:image\/[a-z0-9.+-]+;base64,[a-z0-9+/=]+/i)
        if (dataMatch) push(dataMatch[0])
        const markdownMatches = [...value.matchAll(/!\[[^\]]*\]\((https?:\/\/[^)\s]+)\)/gi)]
        markdownMatches.forEach((match) => push(match[1], true))
      }
      return
    }
    if (Array.isArray(value)) {
      value.forEach((item) => visit(item, key))
      return
    }
    if (typeof value === 'object') {
      Object.entries(value).forEach(([childKey, childValue]) => visit(childValue, childKey))
    }
  }
  visit(input)
  return output.filter(isImageLikeUrl)
}

const buildGenerationResponse = (data, details = {}) => {
  const imageUrls = extractImageUrls(data)
  if (imageUrls.length === 0) {
    const reason = parseFailureReason(data)
    throw new ImageGenerationError(reason || 'Provider did not return an image', 'IMAGE_MISSING')
  }
  return {
    imageUrls,
    adapterKind: details.adapterKind,
    resolvedEndpoint: sanitizeImageDiagnosticUrl(details.endpoint),
    taskId: details.taskId || '',
  }
}

const resolveGrsaiResultEndpoint = (endpoint) => {
  try {
    const url = new URL(endpoint)
    const segments = url.pathname.split('/').filter(Boolean)
    const generateIndex = segments.findIndex((segment) => segment.toLowerCase() === 'generate')
    url.pathname = `/${[
      ...(generateIndex >= 0 ? segments.slice(0, generateIndex) : segments),
      'result',
    ].join('/')}`
    return url.href
  } catch {
    return endpoint.replace(/\/generate\/?$/i, '/result')
  }
}

const extractTaskId = (data, depth = 0) => {
  if (!data || typeof data !== 'object' || depth > 4) return ''
  const values = [
    data.id,
    data.taskId,
    data.task_id,
    data.jobId,
    data.job_id,
    data.requestId,
    data.request_id,
  ]
  const direct = values.find((value) => typeof value === 'string' && value.trim())?.trim()
  if (direct) return direct
  return extractTaskId(data.data, depth + 1) || extractTaskId(data.result, depth + 1)
}

const FAILURE_STATES = new Set([
  'failed',
  'fail',
  'failure',
  'error',
  'errored',
  'cancel',
  'cancelled',
  'canceled',
  'aborted',
  'rejected',
  'denied',
  'blocked',
  'invalid',
  'expired',
  'timeout',
  'timed_out',
])

const findTaskState = (value, depth = 0) => {
  if (!value || typeof value !== 'object' || depth > 5) return ''
  const direct = [value.status, value.state, value.taskStatus, value.task_status]
    .find((item) => typeof item === 'string' && item.trim())
  if (direct) return direct.trim().toLowerCase()
  return findTaskState(value.data, depth + 1) || findTaskState(value.result, depth + 1)
}

const delay = (durationMs) => new Promise((resolve) => setTimeout(resolve, durationMs))

const generateOpenAiImages = async ({ profile, credentials, request, fetchImpl, signal }) => {
  const hasReferences = request.referenceUrls.length > 0
  const endpoint = resolveImageGenerationEndpoint(profile, { hasReferences })
  const size = isLjqclubImageEndpoint(endpoint)
    ? request.aspectRatio
    : resolveOpenAiImageSize(request.aspectRatio, request.resolution)
  if (!hasReferences) {
    const data = await requestJson({
      endpoint,
      method: 'POST',
      body: { model: profile.modelId, prompt: request.prompt, size, n: request.count },
      profile,
      credentials,
      fetchImpl,
      signal,
    })
    return buildGenerationResponse(data, { adapterKind: IMAGE_ADAPTER_KIND.OPENAI_IMAGES, endpoint })
  }

  const formData = new FormData()
  formData.append('model', profile.modelId)
  formData.append('prompt', request.prompt)
  formData.append('size', size)
  formData.append('n', String(request.count))
  for (let index = 0; index < request.referenceUrls.length; index += 1) {
    const blob = await referenceToBlob(request.referenceUrls[index], fetchImpl)
    formData.append('image[]', blob, `reference-${index + 1}.png`)
  }
  const data = await requestForm({ endpoint, formData, profile, credentials, fetchImpl, signal })
  return buildGenerationResponse(data, { adapterKind: IMAGE_ADAPTER_KIND.OPENAI_IMAGES, endpoint })
}

const generateOpenAiChatImage = async ({ profile, credentials, request, fetchImpl, signal }) => {
  const endpoint = resolveImageGenerationEndpoint(profile, { hasReferences: request.referenceUrls.length > 0 })
  const content = request.referenceUrls.length === 0
    ? request.prompt
    : [
        { type: 'text', text: request.prompt },
        ...request.referenceUrls.map((url) => ({ type: 'image_url', image_url: { url } })),
      ]
  const body = {
    model: profile.modelId,
    messages: [{ role: 'user', content }],
    modalities: ['image', 'text'],
    image_config: {
      aspect_ratio: request.aspectRatio,
      size: scaleGeminiImageSize(request.aspectRatio, request.resolution),
    },
  }
  if (request.count > 1) body.n = request.count
  const data = await requestJson({ endpoint, method: 'POST', body, profile, credentials, fetchImpl, signal })
  return buildGenerationResponse(data, { adapterKind: IMAGE_ADAPTER_KIND.OPENAI_CHAT_IMAGE, endpoint })
}

const generateGrsai = async ({
  profile,
  credentials,
  request,
  fetchImpl,
  signal,
  onTaskCreated,
  pollDelayMs = 5000,
  maxPolls = 36,
  delayImpl = delay,
}) => {
  const endpoint = resolveImageGenerationEndpoint(profile, { hasReferences: request.referenceUrls.length > 0 })
  const gptImage = isGptImageModelId(profile.modelId)
  const body = {
    model: profile.modelId,
    prompt: request.prompt,
    images: request.referenceUrls,
    replyType: 'json',
    count: request.count,
    aspectRatio: gptImage
      ? resolveGrsaiGptImageSize(request.aspectRatio, request.resolution)
      : request.aspectRatio,
    ...(gptImage ? {} : { imageSize: request.resolution }),
  }
  const submitted = await requestJson({ endpoint, method: 'POST', body, profile, credentials, fetchImpl, signal })
  const directImages = extractImageUrls(submitted)
  if (directImages.length > 0) {
    return buildGenerationResponse(submitted, { adapterKind: IMAGE_ADAPTER_KIND.GRSAI_ASYNC, endpoint })
  }
  const taskId = extractTaskId(submitted)
  if (!taskId) throw new ImageGenerationError('Grsai did not return an image or task id', 'TASK_ID_MISSING')
  const resultEndpoint = resolveGrsaiResultEndpoint(endpoint)
  await onTaskCreated?.({ taskId, endpoint, resultEndpoint, modelId: profile.modelId, createdAt: Date.now() })

  for (let index = 0; index < maxPolls; index += 1) {
    if (index > 0) await delayImpl(pollDelayMs)
    const result = await requestJson({
      endpoint: `${resultEndpoint}${resultEndpoint.includes('?') ? '&' : '?'}id=${encodeURIComponent(taskId)}`,
      profile,
      credentials,
      fetchImpl,
      signal,
    })
    if (extractImageUrls(result).length > 0) {
      return buildGenerationResponse(result, {
        adapterKind: IMAGE_ADAPTER_KIND.GRSAI_ASYNC,
        endpoint,
        taskId,
      })
    }
    const state = findTaskState(result)
    if (FAILURE_STATES.has(state)) {
      throw new ImageGenerationError(parseFailureReason(result) || 'Grsai task failed', 'TASK_FAILED')
    }
  }
  throw new ImageGenerationError('Grsai task timed out', 'TASK_TIMEOUT', { retryable: true, endpoint })
}

export const generateImage = async ({
  profile,
  credentials = {},
  request,
  fetchImpl = globalThis.fetch,
  signal,
  onTaskCreated,
  pollDelayMs,
  maxPolls,
  delayImpl,
} = {}) => {
  if (typeof fetchImpl !== 'function') throw new ImageGenerationError('Fetch is unavailable', 'NETWORK_UNAVAILABLE')
  if (!credentials.apiKey) throw new ImageGenerationError('API key is required', 'API_KEY_REQUIRED')
  const adapterKind = resolveImageAdapterKind(profile)
  if (adapterKind === IMAGE_ADAPTER_KIND.OPENAI_IMAGES) {
    return generateOpenAiImages({ profile, credentials, request, fetchImpl, signal })
  }
  if (adapterKind === IMAGE_ADAPTER_KIND.GRSAI_ASYNC) {
    return generateGrsai({
      profile,
      credentials,
      request,
      fetchImpl,
      signal,
      onTaskCreated,
      pollDelayMs,
      maxPolls,
      delayImpl,
    })
  }
  return generateOpenAiChatImage({ profile, credentials, request, fetchImpl, signal })
}

export const testImageProviderConnection = async (options = {}) => {
  const profile = options.profile || {}
  const result = await fetchImageModels(options)
  return {
    ok: result.models.length > 0,
    adapterKind: resolveImageAdapterKind(profile),
    source: result.source,
    modelCount: result.models.length,
    endpoint: result.endpoint,
    warning: result.warning || '',
    models: result.models,
  }
}
