export const TTS_ADAPTER_KINDS = Object.freeze({
  CLOUDFLARE_MELOTTS: 'cloudflare_melotts',
  MINIMAX_T2A: 'minimax_t2a',
})

export const TTS_PROVIDER_IDS = Object.freeze({
  CLOUDFLARE_MELOTTS: 'cloudflare-melotts',
  MINIMAX: 'minimax-speech',
})

export const TTS_LIMITS = Object.freeze({
  maxTextChars: 600,
  maxEndpointChars: 2048,
  maxVoiceIdChars: 160,
})

export const TTS_EMOTIONS = Object.freeze([
  'calm',
  'happy',
  'sad',
  'angry',
  'fearful',
  'disgusted',
  'surprised',
])

export const MELOTTS_LANGUAGES = Object.freeze(['zh', 'en'])

export const DEFAULT_TTS_PROVIDER_PROFILES = Object.freeze([
  Object.freeze({
    id: TTS_PROVIDER_IDS.CLOUDFLARE_MELOTTS,
    name: 'Cloudflare MeloTTS',
    adapterKind: TTS_ADAPTER_KINDS.CLOUDFLARE_MELOTTS,
    endpoint: '/api/tts/v1/speech',
    modelId: '@cf/myshell-ai/melotts',
    enabled: true,
    language: 'zh',
    voiceId: '',
    speed: 1,
    volume: 1,
    pitch: 0,
    emotion: 'calm',
  }),
  Object.freeze({
    id: TTS_PROVIDER_IDS.MINIMAX,
    name: 'MiniMax Speech',
    adapterKind: TTS_ADAPTER_KINDS.MINIMAX_T2A,
    endpoint: 'https://api.minimax.io/v1/t2a_v2',
    modelId: 'speech-2.8-turbo',
    enabled: true,
    language: 'zh-CN',
    voiceId: 'Chinese (Mandarin)_Lyrical_Voice',
    speed: 1,
    volume: 1,
    pitch: 0,
    emotion: 'calm',
  }),
])

const normalizeText = (value, fallback = '', maxLength = 240) => {
  const text = typeof value === 'string' ? value.trim() : ''
  return (text || fallback).slice(0, maxLength)
}

const clamp = (value, min, max, fallback) => {
  const number = Number(value)
  if (!Number.isFinite(number)) return fallback
  return Math.min(max, Math.max(min, number))
}

const normalizeCloudflareEndpoint = (value, fallback) => {
  const endpoint = normalizeText(value, fallback, TTS_LIMITS.maxEndpointChars)
  if (endpoint.startsWith('/')) return endpoint
  try {
    const url = new URL(endpoint)
    return url.protocol === 'https:' ? url.toString() : fallback
  } catch {
    return fallback
  }
}

const normalizeMiniMaxEndpoint = (value, fallback) => {
  const endpoint = normalizeText(value, fallback, TTS_LIMITS.maxEndpointChars)
  try {
    const url = new URL(endpoint)
    const hostname = url.hostname.toLowerCase()
    if (
      url.protocol !== 'https:' ||
      !['api.minimax.io', 'api.minimaxi.com'].includes(hostname)
    ) {
      return fallback
    }
    return url.toString()
  } catch {
    return fallback
  }
}

export const getTtsProviderCapabilities = (adapterKind) => ({
  requiresApiKey: adapterKind === TTS_ADAPTER_KINDS.MINIMAX_T2A,
  supportsVoice: adapterKind === TTS_ADAPTER_KINDS.MINIMAX_T2A,
  supportsEmotion: adapterKind === TTS_ADAPTER_KINDS.MINIMAX_T2A,
  supportsProsody: adapterKind === TTS_ADAPTER_KINDS.MINIMAX_T2A,
})

export const normalizeTtsProviderProfile = (input = {}, index = 0) => {
  const fallback = DEFAULT_TTS_PROVIDER_PROFILES[index] || DEFAULT_TTS_PROVIDER_PROFILES[0]
  const adapterKind = Object.values(TTS_ADAPTER_KINDS).includes(input.adapterKind)
    ? input.adapterKind
    : fallback.adapterKind
  const isMiniMax = adapterKind === TTS_ADAPTER_KINDS.MINIMAX_T2A
  const emotion = normalizeText(input.emotion, fallback.emotion, 32).toLowerCase()
  const language = normalizeText(input.language, fallback.language, 32)

  return {
    id: fallback.id,
    name: normalizeText(input.name, fallback.name, 80),
    adapterKind,
    endpoint: isMiniMax
      ? normalizeMiniMaxEndpoint(input.endpoint, fallback.endpoint)
      : normalizeCloudflareEndpoint(input.endpoint, fallback.endpoint),
    modelId: normalizeText(input.modelId, fallback.modelId, 120),
    enabled: input.enabled !== false,
    language: isMiniMax
      ? language || 'zh-CN'
      : MELOTTS_LANGUAGES.includes(language) ? language : fallback.language,
    voiceId: isMiniMax
      ? normalizeText(input.voiceId, fallback.voiceId, TTS_LIMITS.maxVoiceIdChars)
      : '',
    speed: clamp(input.speed, 0.5, 2, fallback.speed),
    volume: clamp(input.volume, 0, 10, fallback.volume),
    pitch: clamp(input.pitch, -12, 12, fallback.pitch),
    emotion: TTS_EMOTIONS.includes(emotion) ? emotion : fallback.emotion,
  }
}

export const normalizeTtsProviderProfiles = (input) =>
  DEFAULT_TTS_PROVIDER_PROFILES.map((fallback, index) => {
    const candidate = Array.isArray(input)
      ? input.find((profile) => profile?.id === fallback.id)
      : null
    return normalizeTtsProviderProfile(candidate || fallback, index)
  })

export const normalizeTtsConfig = (input = {}) => {
  const profiles = normalizeTtsProviderProfiles(input.profiles)
  const activeProfileId = profiles.some((profile) => profile.id === input.activeProfileId)
    ? input.activeProfileId
    : TTS_PROVIDER_IDS.CLOUDFLARE_MELOTTS
  return { profiles, activeProfileId }
}

export const buildTtsRequest = (input = {}, profile = {}) => {
  const text = typeof input.text === 'string' ? input.text.trim() : ''
  const errors = []
  if (!text) errors.push({ field: 'text', code: 'TEXT_REQUIRED' })
  if (text.length > TTS_LIMITS.maxTextChars) {
    errors.push({ field: 'text', code: 'TEXT_TOO_LONG' })
  }
  if (!profile?.id || !Object.values(TTS_ADAPTER_KINDS).includes(profile.adapterKind)) {
    errors.push({ field: 'provider', code: 'PROVIDER_INVALID' })
  }
  if (profile?.enabled === false) errors.push({ field: 'provider', code: 'PROVIDER_DISABLED' })

  if (errors.length) return { ok: false, errors }

  return {
    ok: true,
    value: {
      text,
      language: profile.language,
      voiceId: profile.voiceId,
      speed: profile.speed,
      volume: profile.volume,
      pitch: profile.pitch,
      emotion: profile.emotion,
    },
  }
}
