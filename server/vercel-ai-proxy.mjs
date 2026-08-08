import { timingSafeEqual } from 'node:crypto'
import { Readable } from 'node:stream'

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
  const key = Object.keys(headers).find((candidate) => candidate.toLowerCase() === name.toLowerCase())
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
  const protocol = firstHeaderValue(readHeader(request.headers, 'x-forwarded-proto')).split(',')[0] || 'https'
  const host = firstHeaderValue(readHeader(request.headers, 'x-forwarded-host')) || readHeader(request.headers, 'host')
  return host ? normalizeOrigin(`${protocol}://${host}`) : ''
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
  const allowed = origin === sameOrigin || allowedOriginSet(env.SCHATPHONE_AI_PROXY_ALLOWED_ORIGINS).has(origin)
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

const secureTokenEqual = (actual, expected) => {
  const actualBytes = Buffer.from(String(actual || ''))
  const expectedBytes = Buffer.from(String(expected || ''))
  return actualBytes.length === expectedBytes.length && timingSafeEqual(actualBytes, expectedBytes)
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

const requestBody = async (request) => {
  if (request.body == null) return ''
  if (typeof request.body === 'string') return request.body
  if (Buffer.isBuffer(request.body)) return request.body
  if (request.body instanceof Uint8Array) return request.body
  if (typeof request.body === 'object') return JSON.stringify(request.body)

  const chunks = []
  let size = 0
  for await (const chunk of request) {
    const bytes = Buffer.from(chunk)
    size += bytes.byteLength
    if (size > MAX_REQUEST_BYTES) return null
    chunks.push(bytes)
  }
  return Buffer.concat(chunks)
}

const bodyByteLength = (body) =>
  typeof body === 'string' ? Buffer.byteLength(body) : body?.byteLength || 0

const proxyResponseHeaders = (upstream, corsHeaders) => ({
  'Content-Type': upstream.headers.get('content-type') || 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
  ...corsHeaders,
})

export const handleVercelAiProxyRequest = async (
  request,
  { route, env = process.env, fetchImpl = fetch } = {},
) => {
  const method = String(request.method || 'GET').toUpperCase()
  const cors = resolveCors(request, env)
  if (!cors.allowed) return jsonResponse(403, 'ORIGIN_NOT_ALLOWED')
  if (method === 'OPTIONS') return new Response(null, { status: 204, headers: cors.headers })

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
  if (!secureTokenEqual(readBearerToken(request), clientToken)) {
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
      JSON.parse(Buffer.isBuffer(body) || body instanceof Uint8Array ? Buffer.from(body).toString('utf8') : body)
    } catch {
      return jsonResponse(400, 'INVALID_JSON', cors.headers)
    }
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), normalizeTimeout(env.SCHATPHONE_AI_PROXY_TIMEOUT_MS))
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
    return jsonResponse(error?.name === 'AbortError' ? 504 : 502, error?.name === 'AbortError' ? 'UPSTREAM_TIMEOUT' : 'UPSTREAM_UNAVAILABLE', cors.headers)
  } finally {
    clearTimeout(timeout)
  }
}

export const sendVercelNodeResponse = async (response, webResponse) => {
  response.statusCode = webResponse.status
  webResponse.headers.forEach((value, key) => response.setHeader(key, value))
  if (!webResponse.body) {
    response.end()
    return
  }

  await new Promise((resolve, reject) => {
    const readable = Readable.fromWeb(webResponse.body)
    readable.on('error', reject)
    response.on('finish', resolve)
    response.on('error', reject)
    readable.pipe(response)
  })
}
