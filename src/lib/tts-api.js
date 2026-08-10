import { TTS_ADAPTER_KINDS } from './tts-contract'

const DEFAULT_TIMEOUT_MS = 45_000
const DEFAULT_CLOUDFLARE_RETRY_DELAY_MS = 350
const CLOUDFLARE_RETRYABLE_CODES = new Set([
  'TTS_PROVIDER_UNAVAILABLE',
  'PROVIDER_UNAVAILABLE',
])

export class TtsApiError extends Error {
  constructor(message, code = 'TTS_REQUEST_FAILED', details = {}) {
    super(message)
    this.name = 'TtsApiError'
    this.code = code
    this.status = Number(details.status) || 0
  }
}

const errorForStatus = (status) => {
  if (status === 401 || status === 403) return 'AUTHENTICATION_FAILED'
  if (status === 404) return 'ENDPOINT_NOT_FOUND'
  if (status === 413) return 'TEXT_TOO_LONG'
  if (status === 429) return 'RATE_LIMITED'
  if (status >= 500) return 'PROVIDER_UNAVAILABLE'
  return 'TTS_REQUEST_FAILED'
}

const readErrorCode = async (response) => {
  try {
    const data = await response.json()
    return typeof data?.code === 'string' && data.code ? data.code : errorForStatus(response.status)
  } catch {
    return errorForStatus(response.status)
  }
}

const withRequestSignal = async (externalSignal, timeoutMs, callback) => {
  const controller = new AbortController()
  let timedOut = false
  const abortFromExternal = () => controller.abort(externalSignal?.reason)
  if (externalSignal?.aborted) abortFromExternal()
  else externalSignal?.addEventListener?.('abort', abortFromExternal, { once: true })
  const timerId = setTimeout(() => {
    timedOut = true
    controller.abort()
  }, Math.max(1_000, Number(timeoutMs) || DEFAULT_TIMEOUT_MS))

  try {
    return await callback(controller.signal)
  } catch (error) {
    if (controller.signal.aborted) {
      throw new TtsApiError(
        timedOut ? 'Speech generation timed out.' : 'Speech generation was cancelled.',
        timedOut ? 'TIMEOUT' : 'ABORTED',
      )
    }
    if (error instanceof TtsApiError) throw error
    throw new TtsApiError('Speech provider request failed.', 'NETWORK_ERROR')
  } finally {
    clearTimeout(timerId)
    externalSignal?.removeEventListener?.('abort', abortFromExternal)
  }
}

const hexToBlob = (hex, mimeType = 'audio/mpeg') => {
  const value = typeof hex === 'string' ? hex.trim() : ''
  if (!value || value.length % 2 !== 0 || !/^[0-9a-f]+$/i.test(value)) {
    throw new TtsApiError('MiniMax returned invalid audio data.', 'INVALID_AUDIO_RESPONSE')
  }
  const bytes = new Uint8Array(value.length / 2)
  for (let index = 0; index < value.length; index += 2) {
    bytes[index / 2] = Number.parseInt(value.slice(index, index + 2), 16)
  }
  return new Blob([bytes], { type: mimeType })
}

const waitForRetry = (delayMs, signal) =>
  new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new Error('Speech generation was cancelled.'))
      return
    }
    const onAbort = () => {
      clearTimeout(timerId)
      reject(new Error('Speech generation was cancelled.'))
    }
    const timerId = setTimeout(() => {
      signal?.removeEventListener?.('abort', onAbort)
      resolve()
    }, Math.max(0, Number(delayMs) || 0))
    signal?.addEventListener?.('abort', onAbort, { once: true })
  })

const synthesizeWithCloudflare = async ({
  profile,
  request,
  fetchImpl,
  signal,
  retryDelayMs,
}) => {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const response = await fetchImpl(profile.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: request.text, language: request.language }),
      signal,
    })
    if (!response.ok) {
      const code = await readErrorCode(response)
      if (attempt === 0 && CLOUDFLARE_RETRYABLE_CODES.has(code)) {
        await waitForRetry(retryDelayMs, signal)
        continue
      }
      throw new TtsApiError('Cloudflare speech generation failed.', code, { status: response.status })
    }
    const blob = await response.blob()
    if (!blob.size) throw new TtsApiError('Cloudflare returned empty audio.', 'INVALID_AUDIO_RESPONSE')
    return { blob, mimeType: blob.type || 'application/octet-stream' }
  }

  throw new TtsApiError('Cloudflare speech generation failed.', 'TTS_PROVIDER_UNAVAILABLE')
}

const synthesizeWithMiniMax = async ({ profile, credentials, request, fetchImpl, signal }) => {
  const apiKey = typeof credentials?.apiKey === 'string' ? credentials.apiKey.trim() : ''
  if (!apiKey) throw new TtsApiError('MiniMax API key is required.', 'API_KEY_REQUIRED')

  const response = await fetchImpl(profile.endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: profile.modelId,
      text: request.text,
      stream: false,
      language_boost: 'Chinese',
      output_format: 'hex',
      voice_setting: {
        voice_id: request.voiceId,
        speed: request.speed,
        vol: request.volume,
        pitch: request.pitch,
        emotion: request.emotion,
      },
      audio_setting: {
        sample_rate: 32000,
        bitrate: 128000,
        format: 'mp3',
        channel: 1,
      },
    }),
    signal,
  })

  if (!response.ok) {
    const code = await readErrorCode(response)
    throw new TtsApiError('MiniMax speech generation failed.', code, { status: response.status })
  }

  let data
  try {
    data = await response.json()
  } catch {
    throw new TtsApiError('MiniMax returned an unreadable response.', 'INVALID_PROVIDER_RESPONSE')
  }
  if (Number(data?.base_resp?.status_code || 0) !== 0) {
    throw new TtsApiError('MiniMax rejected the speech request.', 'PROVIDER_REJECTED')
  }
  return { blob: hexToBlob(data?.data?.audio), mimeType: 'audio/mpeg' }
}

export const synthesizeSpeech = async ({
  profile,
  credentials = {},
  request,
  fetchImpl = globalThis.fetch,
  signal,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  cloudflareRetryDelayMs = DEFAULT_CLOUDFLARE_RETRY_DELAY_MS,
} = {}) => {
  if (typeof fetchImpl !== 'function') {
    throw new TtsApiError('Fetch is unavailable.', 'TRANSPORT_UNAVAILABLE')
  }

  return withRequestSignal(signal, timeoutMs, async (requestSignal) => {
    let result
    if (profile?.adapterKind === TTS_ADAPTER_KINDS.CLOUDFLARE_MELOTTS) {
      result = await synthesizeWithCloudflare({
        profile,
        request,
        fetchImpl,
        signal: requestSignal,
        retryDelayMs: cloudflareRetryDelayMs,
      })
    } else if (profile?.adapterKind === TTS_ADAPTER_KINDS.MINIMAX_T2A) {
      result = await synthesizeWithMiniMax({
        profile,
        credentials,
        request,
        fetchImpl,
        signal: requestSignal,
      })
    } else {
      throw new TtsApiError('Unsupported speech provider.', 'ADAPTER_UNSUPPORTED')
    }

    return {
      ...result,
      providerId: profile.id,
      adapterKind: profile.adapterKind,
      modelId: profile.modelId,
    }
  })
}

export const decodeMiniMaxAudioHex = hexToBlob
