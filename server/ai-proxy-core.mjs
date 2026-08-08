const DEFAULT_TIMEOUT_MS = 30_000
const MAX_TIMEOUT_MS = 60_000
const MAX_REQUEST_BYTES = 2 * 1024 * 1024
const ALLOWED_METHODS = 'GET, POST, OPTIONS'
const ALLOWED_HEADERS = 'Authorization, Content-Type'

const firstHeaderValue = (value) => {
  if (Array.isArray(value)) return String(value[0] || '').trim()
  return typeof value === 'string' ? value.trim() : ''
}

const readHeader = (headers, name) => {
  if (!headers) return ''
  if (typeof headers.get === 'function') return firstHeaderValue(headers.get(name))
  const key = Object.keys(headers).find(
    (candidate) => candidate.toLowerCase() === name.toLowerCase(),
  )
  return key ? firstHeaderValue(headers[key]) : ''
}

const normalizeOrigin = (value) => {
  try {
    return new URL(value).origin
  } catch {
    return ''
  }
}

const requestOrigin = (request) => {
  const protocol =
    firstHeaderValue(readHeader(request.headers, 'x-forwarded-proto')).split(',')[0] || 'https'
  const host =
    firstHeaderValue(readHeader(request.headers, 'x-forwarded-host')) ||
    readHeader(request.headers, 'host')
  if (host) return normalizeOrigin(`${protocol}://${host}`)
  return normalizeOrigin(request.url)
}

const allowedOriginSet = (value) =>
  new Set(
    String(value || '')
      .split(',')
      .map((item) => normalizeOrigin(item.trim()))
      .filter(Boolean),
  )

const resolveCors = (request, env) => {
  const origin = normalizeOrigin(readHeader(request.headers, 'origin'))
  if (!origin) return { allowed: true, headers: {} }

  const sameOrigin = requestOrigin(request)
  const allowed =
    origin === sameOrigin || allowedOriginSet(env.SCHATPHONE_AI_PROXY_ALLOWED_ORIGINS).has(origin)
  if (!allowed) return { allowed: false, headers: {} }

  return {
    allowed: true,
    headers: {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': ALLOWED_METHODS,
      'Access-Control-Allow-Headers': ALLOWED_HEADERS,
      'Access-Control-Max-Age': '86400',
      Vary: 'Origin',
    },
  }
}

const secureTokenEqual = async (actual, expected) => {
  const encoder = new TextEncoder()
  const [actualDigest, expectedDigest] = await Promise.all([
    crypto.subtle.digest('SHA-256', encoder.encode(String(actual || ''))),
    crypto.subtle.digest('SHA-256', encoder.encode(String(expected || ''))),
  ])
  const actualBytes = new Uint8Array(actualDigest)
  const expectedBytes = new Uint8Array(expectedDigest)
  let mismatch = 0
  for (let index = 0; index < actualBytes.length; index += 1) {
    mismatch |= actualBytes[index] ^ expectedBytes[index]
  }
  return mismatch === 0
}

const readBearerToken = (request) => {
  const authorization = readHeader(request.headers, 'authorization')
  const match = /^Bearer\s+(.+)$/i.exec(authorization)
  return match?.[1]?.trim() || ''
}

const jsonResponse = (status, code, corsHeaders = {}) =>
  new Response(JSON.stringify({ ok: false, code }), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      ...corsHeaders,
    },
  })

const normalizeTimeout = (value) => {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return DEFAULT_TIMEOUT_MS
  return Math.min(MAX_TIMEOUT_MS, Math.max(5_000, Math.floor(parsed)))
}

const parseUpstreamBase = (value) => {
  try {
    const url = new URL(String(value || '').trim())
    if (url.protocol !== 'https:') return null
    url.hash = ''
    return url
  } catch {
    return null
  }
}

export const resolveProxyUpstreamUrl = (value, route) => {
  const url = parseUpstreamBase(value)
  if (!url) return null

  const path = url.pathname.replace(/\/+$/, '')
  if (route === 'models') {
    if (path.endsWith('/chat/completions')) {
      url.pathname = `${path.slice(0, -'/chat/completions'.length)}/models`
    } else if (!path.endsWith('/models')) {
      url.pathname = path.endsWith('/v1') ? `${path}/models` : `${path || '/v1'}/models`
    }
    return url
  }

  if (path.endsWith('/models')) {
    url.pathname = `${path.slice(0, -'/models'.length)}/chat/completions`
  } else if (!path.endsWith('/chat/completions')) {
    url.pathname = path.endsWith('/v1')
      ? `${path}/chat/completions`
      : `${path || '/v1'}/chat/completions`
  }
  return url
}

const readWebStream = async (stream) => {
  const reader = stream.getReader()
  const chunks = []
  let size = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      const bytes = value instanceof Uint8Array ? value : new Uint8Array(value)
      size += bytes.byteLength
      if (size > MAX_REQUEST_BYTES) return null
      chunks.push(bytes)
    }
  } finally {
    reader.releaseLock()
  }

  const result = new Uint8Array(size)
  let offset = 0
  for (const chunk of chunks) {
    result.set(chunk, offset)
    offset += chunk.byteLength
  }
  return result
}

const readNodeStream = async (request) => {
  const chunks = []
  let size = 0
  for await (const chunk of request) {
    const bytes =
      typeof chunk === 'string'
        ? new TextEncoder().encode(chunk)
        : new Uint8Array(chunk.buffer, chunk.byteOffset, chunk.byteLength)
    size += bytes.byteLength
    if (size > MAX_REQUEST_BYTES) return null
    chunks.push(bytes)
  }

  const result = new Uint8Array(size)
  let offset = 0
  for (const chunk of chunks) {
    result.set(chunk, offset)
    offset += chunk.byteLength
  }
  return result
}

const requestBody = async (request) => {
  if (request.body == null) return ''
  if (typeof request.body === 'string') return request.body
  if (request.body instanceof ArrayBuffer) return new Uint8Array(request.body)
  if (ArrayBuffer.isView(request.body)) {
    return new Uint8Array(request.body.buffer, request.body.byteOffset, request.body.byteLength)
  }
  if (typeof request.body.getReader === 'function') return readWebStream(request.body)
  if (typeof request.body === 'object' && request.body.constructor === Object) {
    return JSON.stringify(request.body)
  }
  if (typeof request[Symbol.asyncIterator] === 'function') return readNodeStream(request)
  return ''
}

const bodyByteLength = (body) =>
  typeof body === 'string' ? new TextEncoder().encode(body).byteLength : body?.byteLength || 0

const bodyText = (body) => (typeof body === 'string' ? body : new TextDecoder().decode(body))

const proxyResponseHeaders = (upstream, corsHeaders) => ({
  'Content-Type': upstream.headers.get('content-type') || 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
  ...corsHeaders,
})

export const handleAiProxyRequest = async (
  request,
  { route, env = {}, fetchImpl = fetch } = {},
) => {
  const method = String(request.method || 'GET').toUpperCase()
  const cors = resolveCors(request, env)
  if (!cors.allowed) return jsonResponse(403, 'ORIGIN_NOT_ALLOWED')
  if (method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors.headers })
  }

  const expectedMethod = route === 'models' ? 'GET' : 'POST'
  if (method !== expectedMethod) {
    return new Response(JSON.stringify({ ok: false, code: 'METHOD_NOT_ALLOWED' }), {
      status: 405,
      headers: {
        Allow: `${expectedMethod}, OPTIONS`,
        'Content-Type': 'application/json; charset=utf-8',
        ...cors.headers,
      },
    })
  }

  const clientToken = String(env.SCHATPHONE_AI_PROXY_CLIENT_TOKEN || '').trim()
  if (!clientToken) return jsonResponse(503, 'PROXY_NOT_CONFIGURED', cors.headers)
  if (!(await secureTokenEqual(readBearerToken(request), clientToken))) {
    return jsonResponse(401, 'UNAUTHORIZED', cors.headers)
  }

  const upstreamUrl = resolveProxyUpstreamUrl(env.SCHATPHONE_AI_PROXY_UPSTREAM_URL, route)
  if (!upstreamUrl) return jsonResponse(503, 'UPSTREAM_NOT_CONFIGURED', cors.headers)
  if (normalizeOrigin(upstreamUrl.toString()) === requestOrigin(request)) {
    return jsonResponse(503, 'UPSTREAM_LOOP_BLOCKED', cors.headers)
  }

  const upstreamKey = String(env.SCHATPHONE_AI_PROXY_UPSTREAM_KEY || '').trim()
  const allowKeyless = String(env.SCHATPHONE_AI_PROXY_ALLOW_KEYLESS || '').toLowerCase() === 'true'
  if (!upstreamKey && !allowKeyless) {
    return jsonResponse(503, 'UPSTREAM_KEY_NOT_CONFIGURED', cors.headers)
  }

  let body
  if (method === 'POST') {
    body = await requestBody(request)
    if (body == null || bodyByteLength(body) > MAX_REQUEST_BYTES) {
      return jsonResponse(413, 'REQUEST_TOO_LARGE', cors.headers)
    }
    try {
      JSON.parse(bodyText(body))
    } catch {
      return jsonResponse(400, 'INVALID_JSON', cors.headers)
    }
  }

  const controller = new AbortController()
  const timeout = setTimeout(
    () => controller.abort(),
    normalizeTimeout(env.SCHATPHONE_AI_PROXY_TIMEOUT_MS),
  )
  try {
    const headers = {
      Accept: 'application/json, text/event-stream',
      ...(method === 'POST' ? { 'Content-Type': 'application/json' } : {}),
      ...(upstreamKey ? { Authorization: `Bearer ${upstreamKey}` } : {}),
    }
    const upstream = await fetchImpl(upstreamUrl, {
      method,
      headers,
      ...(method === 'POST' ? { body } : {}),
      signal: controller.signal,
    })
    return new Response(upstream.body, {
      status: upstream.status,
      headers: proxyResponseHeaders(upstream, cors.headers),
    })
  } catch (error) {
    const timedOut = error?.name === 'AbortError'
    return jsonResponse(
      timedOut ? 504 : 502,
      timedOut ? 'UPSTREAM_TIMEOUT' : 'UPSTREAM_UNAVAILABLE',
      cors.headers,
    )
  } finally {
    clearTimeout(timeout)
  }
}
