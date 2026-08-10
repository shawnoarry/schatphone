const MAX_REQUEST_BYTES = 16 * 1024
const MAX_TEXT_CHARS = 600
const MAX_AUDIO_BYTES = 12 * 1024 * 1024
const RATE_LIMIT_WINDOW_MS = 60_000
const DEFAULT_RATE_LIMIT = 20
const MAX_RATE_LIMIT = 120
const ALLOWED_LANGUAGES = new Set(['zh', 'en'])
const MELOTTS_LANGUAGE_CODES = new Map([['zh', 'ZH']])
const rateLimitBuckets = new Map()

const normalizeOrigin = (value) => {
  try {
    return new URL(value).origin
  } catch {
    return ''
  }
}

const requestOrigin = (request) => {
  const forwardedProtocol = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim()
  const forwardedHost = request.headers.get('x-forwarded-host')?.split(',')[0]?.trim()
  if (forwardedHost) return normalizeOrigin(`${forwardedProtocol || 'https'}://${forwardedHost}`)
  return normalizeOrigin(request.url)
}

const allowedOrigins = (env) =>
  new Set(
    String(
      env.SCHATPHONE_TTS_ALLOWED_ORIGINS || env.SCHATPHONE_AI_PROXY_ALLOWED_ORIGINS || '',
    )
      .split(',')
      .map((value) => normalizeOrigin(value.trim()))
      .filter(Boolean),
  )

const resolveCors = (request, env) => {
  const origin = normalizeOrigin(request.headers.get('origin'))
  if (!origin) return { allowed: true, headers: {} }
  if (origin !== requestOrigin(request) && !allowedOrigins(env).has(origin)) {
    return { allowed: false, headers: {} }
  }
  return {
    allowed: true,
    headers: {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
      Vary: 'Origin',
    },
  }
}

const jsonError = (status, code, corsHeaders = {}, extraHeaders = {}) =>
  new Response(JSON.stringify({ ok: false, code }), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      ...corsHeaders,
      ...extraHeaders,
    },
  })

const normalizeRateLimit = (value) => {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return DEFAULT_RATE_LIMIT
  return Math.min(MAX_RATE_LIMIT, Math.max(1, Math.floor(parsed)))
}

const requestClientId = (request) =>
  request.headers.get('cf-connecting-ip') ||
  request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
  normalizeOrigin(request.headers.get('origin')) ||
  'unknown'

const consumeRateLimit = (request, env) => {
  const windowId = Math.floor(Date.now() / RATE_LIMIT_WINDOW_MS)
  const key = `${requestClientId(request)}:${windowId}`
  const count = (rateLimitBuckets.get(key) || 0) + 1
  rateLimitBuckets.set(key, count)
  if (rateLimitBuckets.size > 2048) {
    for (const bucketKey of rateLimitBuckets.keys()) {
      const bucketWindow = Number(bucketKey.slice(bucketKey.lastIndexOf(':') + 1))
      if (bucketWindow < windowId) rateLimitBuckets.delete(bucketKey)
    }
  }
  return count <= normalizeRateLimit(env.SCHATPHONE_TTS_RATE_LIMIT_PER_MINUTE)
}

const decodeBase64 = (value) => {
  const text = typeof value === 'string' ? value.trim() : ''
  if (!text || text.length > Math.ceil(MAX_AUDIO_BYTES / 3) * 4 + 4) return null
  try {
    const binary = atob(text)
    if (!binary.length || binary.length > MAX_AUDIO_BYTES) return null
    const bytes = new Uint8Array(binary.length)
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index)
    }
    return bytes
  } catch {
    return null
  }
}

const responseAudio = async (result) => {
  if (result instanceof Response) {
    if (!result.ok) return null
    const bytes = new Uint8Array(await result.arrayBuffer())
    return bytes.length && bytes.length <= MAX_AUDIO_BYTES ? bytes : null
  }
  if (result instanceof ArrayBuffer) {
    const bytes = new Uint8Array(result)
    return bytes.length && bytes.length <= MAX_AUDIO_BYTES ? bytes : null
  }
  if (ArrayBuffer.isView(result)) {
    const bytes = new Uint8Array(result.buffer, result.byteOffset, result.byteLength)
    return bytes.length && bytes.length <= MAX_AUDIO_BYTES ? bytes : null
  }
  if (ArrayBuffer.isView(result?.audio)) {
    const bytes = new Uint8Array(
      result.audio.buffer,
      result.audio.byteOffset,
      result.audio.byteLength,
    )
    return bytes.length && bytes.length <= MAX_AUDIO_BYTES ? bytes : null
  }
  return decodeBase64(result?.audio)
}

const hasAsciiSignature = (bytes, offset, signature) => {
  if (bytes.length < offset + signature.length) return false
  return [...signature].every((character, index) => bytes[offset + index] === character.charCodeAt(0))
}

const detectAudioMimeType = (bytes) => {
  if (hasAsciiSignature(bytes, 0, 'RIFF') && hasAsciiSignature(bytes, 8, 'WAVE')) {
    return 'audio/wav'
  }
  if (hasAsciiSignature(bytes, 0, 'ID3')) return 'audio/mpeg'
  if (bytes.length >= 2 && bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0) {
    return 'audio/mpeg'
  }
  return ''
}

export const handleCloudflareTtsRequest = async (request, { env = {} } = {}) => {
  const cors = resolveCors(request, env)
  if (!cors.allowed) return jsonError(403, 'ORIGIN_NOT_ALLOWED')
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors.headers })
  }
  if (request.method !== 'POST') {
    return jsonError(405, 'METHOD_NOT_ALLOWED', cors.headers, { Allow: 'POST, OPTIONS' })
  }
  if (!consumeRateLimit(request, env)) {
    return jsonError(429, 'RATE_LIMITED', cors.headers, { 'Retry-After': '60' })
  }
  if (!env.AI || typeof env.AI.run !== 'function') {
    return jsonError(503, 'TTS_NOT_CONFIGURED', cors.headers)
  }

  const declaredLength = Number(request.headers.get('content-length') || 0)
  if (declaredLength > MAX_REQUEST_BYTES) {
    return jsonError(413, 'REQUEST_TOO_LARGE', cors.headers)
  }

  let rawBody
  try {
    rawBody = await request.text()
  } catch {
    return jsonError(400, 'REQUEST_INVALID', cors.headers)
  }
  if (new TextEncoder().encode(rawBody).byteLength > MAX_REQUEST_BYTES) {
    return jsonError(413, 'REQUEST_TOO_LARGE', cors.headers)
  }

  let body
  try {
    body = JSON.parse(rawBody)
  } catch {
    return jsonError(400, 'REQUEST_INVALID', cors.headers)
  }
  const text = typeof body?.text === 'string' ? body.text.trim() : ''
  const language = typeof body?.language === 'string' ? body.language.trim() : 'zh'
  if (!text) return jsonError(400, 'TEXT_REQUIRED', cors.headers)
  if (text.length > MAX_TEXT_CHARS) return jsonError(413, 'TEXT_TOO_LONG', cors.headers)
  if (!ALLOWED_LANGUAGES.has(language)) {
    return jsonError(400, 'LANGUAGE_UNSUPPORTED', cors.headers)
  }

  try {
    const result = await env.AI.run('@cf/myshell-ai/melotts', {
      prompt: text,
      lang: MELOTTS_LANGUAGE_CODES.get(language) || language,
    })
    const audio = await responseAudio(result)
    if (!audio) return jsonError(502, 'INVALID_AUDIO_RESPONSE', cors.headers)
    const mimeType = detectAudioMimeType(audio)
    if (!mimeType) return jsonError(502, 'INVALID_AUDIO_RESPONSE', cors.headers)
    return new Response(audio, {
      status: 200,
      headers: {
        'Content-Type': mimeType,
        'Content-Length': String(audio.byteLength),
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
        ...cors.headers,
      },
    })
  } catch {
    return jsonError(502, 'TTS_PROVIDER_UNAVAILABLE', cors.headers)
  }
}
