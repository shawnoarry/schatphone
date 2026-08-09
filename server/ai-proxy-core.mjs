const DEFAULT_TIMEOUT_MS = 30_000
const MAX_TIMEOUT_MS = 60_000
const MAX_REQUEST_BYTES = 2 * 1024 * 1024
const MAX_UPSTREAM_URL_CHARS = 2048
const DEFAULT_DYNAMIC_RATE_LIMIT = 60
const MAX_DYNAMIC_RATE_LIMIT = 600
const RATE_LIMIT_WINDOW_MS = 60_000
const ALLOWED_METHODS = 'GET, POST, OPTIONS'
const ALLOWED_HEADERS =
  'Authorization, Content-Type, X-SchatPhone-Upstream-URL, X-SchatPhone-Proxy-Token'
const UPSTREAM_URL_HEADER = 'x-schatphone-upstream-url'
const PROXY_TOKEN_HEADER = 'x-schatphone-proxy-token'
const DYNAMIC_MODE_PUBLIC = 'public'
const DYNAMIC_MODE_TOKEN = 'token'
const dynamicRateLimitBuckets = new Map()

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

const normalizeDynamicMode = (value) => {
  const mode = String(value || '').trim().toLowerCase()
  if (mode === DYNAMIC_MODE_PUBLIC || mode === DYNAMIC_MODE_TOKEN) return mode
  return ''
}

const hasPublicBrowserSource = (request) => {
  if (normalizeOrigin(readHeader(request.headers, 'origin'))) return true
  return readHeader(request.headers, 'sec-fetch-site').toLowerCase() === 'same-origin'
}

const parseIpv4 = (hostname) => {
  const parts = String(hostname || '').split('.')
  if (parts.length !== 4) return null
  const octets = parts.map((part) => Number(part))
  if (octets.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return null
  return octets
}

const isBlockedIpv4 = (octets) => {
  if (!octets) return false
  const [a, b] = octets
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 0) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224
  )
}

const isBlockedDynamicHostname = (hostname) => {
  const normalized = String(hostname || '').trim().toLowerCase().replace(/\.$/, '')
  if (!normalized || normalized.length > 253) return true
  if (normalized.includes(':')) return true
  if (isBlockedIpv4(parseIpv4(normalized))) return true
  if (!normalized.includes('.')) return true

  return [
    '.localhost',
    '.local',
    '.internal',
    '.home',
    '.lan',
    '.test',
    '.example',
    '.invalid',
    '.onion',
  ].some((suffix) => normalized === suffix.slice(1) || normalized.endsWith(suffix))
}

export const validateDynamicProxyTarget = (value) => {
  const raw = String(value || '').trim()
  if (!raw || raw.length > MAX_UPSTREAM_URL_CHARS) return null
  const url = parseUpstreamBase(raw)
  if (!url || url.username || url.password) return null
  if (url.port && url.port !== '443') return null
  if (isBlockedDynamicHostname(url.hostname)) return null
  return url
}

const normalizeRateLimit = (value) => {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return DEFAULT_DYNAMIC_RATE_LIMIT
  return Math.min(MAX_DYNAMIC_RATE_LIMIT, Math.max(1, Math.floor(parsed)))
}

const requestClientId = (request) => {
  const cloudflareIp = firstHeaderValue(readHeader(request.headers, 'cf-connecting-ip'))
  const forwardedIp = firstHeaderValue(readHeader(request.headers, 'x-forwarded-for')).split(',')[0]
  return cloudflareIp || forwardedIp || normalizeOrigin(readHeader(request.headers, 'origin')) || 'unknown'
}

const consumeDynamicRateLimit = (request, env) => {
  const now = Date.now()
  const windowId = Math.floor(now / RATE_LIMIT_WINDOW_MS)
  const key = `${requestClientId(request)}:${windowId}`
  const nextCount = (dynamicRateLimitBuckets.get(key) || 0) + 1
  dynamicRateLimitBuckets.set(key, nextCount)

  if (dynamicRateLimitBuckets.size > 2048) {
    for (const bucketKey of dynamicRateLimitBuckets.keys()) {
      const bucketWindow = Number(bucketKey.slice(bucketKey.lastIndexOf(':') + 1))
      if (bucketWindow < windowId) dynamicRateLimitBuckets.delete(bucketKey)
    }
  }

  return nextCount <= normalizeRateLimit(env.SCHATPHONE_AI_PROXY_RATE_LIMIT_PER_MINUTE)
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

  const requestedDynamicTarget = readHeader(request.headers, UPSTREAM_URL_HEADER)
  const dynamicMode = normalizeDynamicMode(env.SCHATPHONE_AI_PROXY_DYNAMIC_MODE)
  let upstreamBase
  let upstreamAuthorization = ''

  if (requestedDynamicTarget) {
    if (!dynamicMode) return jsonResponse(503, 'DYNAMIC_PROXY_DISABLED', cors.headers)

    if (dynamicMode === DYNAMIC_MODE_PUBLIC && !hasPublicBrowserSource(request)) {
      return jsonResponse(403, 'PROXY_ORIGIN_REQUIRED', cors.headers)
    }

    if (dynamicMode === DYNAMIC_MODE_TOKEN) {
      const expectedProxyToken = String(env.SCHATPHONE_AI_PROXY_CLIENT_TOKEN || '').trim()
      if (!expectedProxyToken) return jsonResponse(503, 'PROXY_NOT_CONFIGURED', cors.headers)
      if (!(await secureTokenEqual(readHeader(request.headers, PROXY_TOKEN_HEADER), expectedProxyToken))) {
        return jsonResponse(401, 'PROXY_ACCESS_REQUIRED', cors.headers)
      }
    }

    upstreamBase = validateDynamicProxyTarget(requestedDynamicTarget)
    if (!upstreamBase) return jsonResponse(403, 'PROXY_TARGET_NOT_ALLOWED', cors.headers)
    if (!consumeDynamicRateLimit(request, env)) {
      return jsonResponse(429, 'PROXY_RATE_LIMITED', {
        ...cors.headers,
        'Retry-After': '60',
      })
    }

    const authorization = readHeader(request.headers, 'authorization')
    if (authorization && !/^Bearer\s+\S+$/i.test(authorization)) {
      return jsonResponse(400, 'INVALID_UPSTREAM_AUTHORIZATION', cors.headers)
    }
    upstreamAuthorization = authorization
  } else {
    const clientToken = String(env.SCHATPHONE_AI_PROXY_CLIENT_TOKEN || '').trim()
    if (!clientToken) return jsonResponse(503, 'PROXY_NOT_CONFIGURED', cors.headers)
    if (!(await secureTokenEqual(readBearerToken(request), clientToken))) {
      return jsonResponse(401, 'UNAUTHORIZED', cors.headers)
    }
    upstreamBase = parseUpstreamBase(env.SCHATPHONE_AI_PROXY_UPSTREAM_URL)
    if (!upstreamBase) return jsonResponse(503, 'UPSTREAM_NOT_CONFIGURED', cors.headers)

    const upstreamKey = String(env.SCHATPHONE_AI_PROXY_UPSTREAM_KEY || '').trim()
    const allowKeyless = String(env.SCHATPHONE_AI_PROXY_ALLOW_KEYLESS || '').toLowerCase() === 'true'
    if (!upstreamKey && !allowKeyless) {
      return jsonResponse(503, 'UPSTREAM_KEY_NOT_CONFIGURED', cors.headers)
    }
    upstreamAuthorization = upstreamKey ? `Bearer ${upstreamKey}` : ''
  }

  const upstreamUrl = resolveProxyUpstreamUrl(upstreamBase.toString(), route)
  if (!upstreamUrl) return jsonResponse(503, 'UPSTREAM_NOT_CONFIGURED', cors.headers)
  if (normalizeOrigin(upstreamUrl.toString()) === requestOrigin(request)) {
    return jsonResponse(503, 'UPSTREAM_LOOP_BLOCKED', cors.headers)
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
      ...(upstreamAuthorization ? { Authorization: upstreamAuthorization } : {}),
    }
    const upstream = await fetchImpl(upstreamUrl, {
      method,
      headers,
      ...(method === 'POST' ? { body } : {}),
      redirect: 'manual',
      signal: controller.signal,
    })
    if (upstream.status >= 300 && upstream.status < 400) {
      return jsonResponse(502, 'UPSTREAM_REDIRECT_BLOCKED', cors.headers)
    }
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
