export const IMAGE_ADAPTER_KIND = Object.freeze({
  AUTO: 'auto',
  OPENAI_IMAGES: 'openai_images',
  OPENAI_CHAT_IMAGE: 'openai_chat_image',
  GRSAI_ASYNC: 'grsai_async',
})

export const IMAGE_ADAPTER_KINDS = Object.freeze(Object.values(IMAGE_ADAPTER_KIND))

export const IMAGE_GENERATION_LIMITS = Object.freeze({
  maxProfiles: 20,
  maxReferences: 4,
  maxCandidates: 30,
  candidateMaxAgeMs: 7 * 24 * 60 * 60 * 1000,
  maxDiagnosticRecords: 24,
})

export const IMAGE_ASPECT_RATIOS = Object.freeze([
  '1:1',
  '4:5',
  '3:4',
  '2:3',
  '9:16',
  '5:4',
  '4:3',
  '3:2',
  '16:9',
  '21:9',
])

export const IMAGE_RESOLUTIONS = Object.freeze(['1K', '2K', '4K'])

export const DEFAULT_IMAGE_PROVIDER_PROFILES = Object.freeze([
  Object.freeze({
    id: 'image_provider_ljqclub',
    name: 'LJQ Club',
    endpoint: 'https://ljqclub.com/',
    adapterKind: IMAGE_ADAPTER_KIND.AUTO,
    modelId: 'gpt-image-2',
    useProxy: false,
    proxyUrl: '',
    enabled: true,
  }),
  Object.freeze({
    id: 'image_provider_grsai',
    name: 'Grsai',
    endpoint: 'https://grsaiapi.com/v1/api/generate',
    adapterKind: IMAGE_ADAPTER_KIND.GRSAI_ASYNC,
    modelId: 'nano-banana-2',
    useProxy: false,
    proxyUrl: '',
    enabled: true,
  }),
  Object.freeze({
    id: 'image_provider_aixoras',
    name: 'Aixoras',
    endpoint: 'https://api.aixoras.com/v1',
    adapterKind: IMAGE_ADAPTER_KIND.AUTO,
    modelId: 'nano-banana-2',
    useProxy: false,
    proxyUrl: '',
    enabled: true,
  }),
])

const COMPLETE_ENDPOINT_SUFFIXES = [
  '/chat/completions',
  '/images/generations',
  '/images/edits',
  '/v1/api/generate',
  '/api/generate',
  '/completions',
  '/responses',
]

const GEMINI_SIZE_MAP = Object.freeze({
  '1:1': '1024x1024',
  '2:3': '832x1248',
  '3:2': '1248x832',
  '3:4': '864x1184',
  '4:3': '1184x864',
  '4:5': '896x1152',
  '5:4': '1152x896',
  '9:16': '768x1344',
  '16:9': '1344x768',
  '21:9': '1536x672',
})

const GRSAI_GPT_SIZE_MAP = Object.freeze({
  '1K': Object.freeze({
    '1:1': '1280x1280',
    '2:3': '848x1280',
    '3:2': '1280x848',
    '3:4': '960x1280',
    '4:3': '1280x960',
    '4:5': '1024x1280',
    '5:4': '1280x1024',
    '9:16': '720x1280',
    '16:9': '1280x720',
    '21:9': '1280x544',
  }),
  '2K': Object.freeze({
    '1:1': '2048x2048',
    '2:3': '1360x2048',
    '3:2': '2048x1360',
    '3:4': '1536x2048',
    '4:3': '2048x1536',
    '4:5': '1632x2048',
    '5:4': '2048x1632',
    '9:16': '1152x2048',
    '16:9': '2048x1152',
    '21:9': '2048x864',
  }),
  '4K': Object.freeze({
    '1:1': '2880x2880',
    '2:3': '2336x3520',
    '3:2': '3520x2336',
    '3:4': '2480x3312',
    '4:3': '3312x2480',
    '4:5': '2560x3216',
    '5:4': '3216x2560',
    '9:16': '2160x3840',
    '16:9': '3840x2160',
    '21:9': '3840x1632',
  }),
})

const OPENAI_IMAGE_MIN_PIXELS = 655_360
const OPENAI_IMAGE_MAX_PIXELS = 8_294_400
const OPENAI_IMAGE_MAX_EDGE = 3840
const OPENAI_IMAGE_MAX_SIDE_RATIO = 3
const OPENAI_IMAGE_SIZE_UNIT = 16

const trimText = (value, maxLength = 500) => {
  if (typeof value !== 'string') return ''
  return value.trim().slice(0, maxLength)
}

const normalizeTimestamp = (value, fallback = Date.now()) => {
  const timestamp = Number(value)
  if (!Number.isFinite(timestamp) || timestamp <= 0) return Math.floor(fallback)
  return Math.floor(timestamp)
}

const createStableId = (prefix) => {
  const randomUuid = globalThis.crypto?.randomUUID?.bind(globalThis.crypto)
  if (randomUuid) return `${prefix}_${randomUuid()}`
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

export const createImageProfileId = () => createStableId('image_provider')
export const createImageCandidateId = () => createStableId('image_candidate')
export const createImageRequestId = () => createStableId('image_request')

export const normalizeImageHttpUrl = (value) => {
  const text = trimText(value, 2000)
  if (!text) return ''
  try {
    const url = new URL(text)
    if (!['http:', 'https:'].includes(url.protocol.toLowerCase())) return ''
    return url.href
  } catch {
    return ''
  }
}

export const sanitizeImageDiagnosticUrl = (value) => {
  const normalized = normalizeImageHttpUrl(value)
  if (!normalized) return ''
  try {
    const url = new URL(normalized)
    url.username = ''
    url.password = ''
    url.search = ''
    url.hash = ''
    return url.href
  } catch {
    return ''
  }
}

export const normalizeImageAdapterKind = (value) =>
  IMAGE_ADAPTER_KINDS.includes(value) ? value : IMAGE_ADAPTER_KIND.AUTO

export const getImageEndpointPath = (endpoint) => {
  try {
    return new URL(endpoint).pathname.replace(/\/+$/, '').toLowerCase()
  } catch {
    return trimText(endpoint, 2000).replace(/\/+$/, '').toLowerCase()
  }
}

export const isGrsaiImageEndpoint = (endpoint) => {
  try {
    const url = new URL(endpoint)
    return (
      url.hostname.toLowerCase().includes('grsai') ||
      getImageEndpointPath(endpoint).endsWith('/api/generate')
    )
  } catch {
    const normalized = trimText(endpoint, 2000).toLowerCase()
    return normalized.includes('grsai') || normalized.endsWith('/api/generate')
  }
}

export const isLjqclubImageEndpoint = (endpoint) => {
  try {
    const hostname = new URL(endpoint).hostname.toLowerCase()
    return hostname === 'ljqclub.com' || hostname.endsWith('.ljqclub.com')
  } catch {
    return trimText(endpoint, 2000).toLowerCase().includes('ljqclub.com')
  }
}

export const isGptImageModelId = (modelId) =>
  /gpt[\s_-]*image|gptimage|dall[\s_-]*e/i.test(trimText(modelId, 160))

export const isNanoBananaModelId = (modelId) =>
  trimText(modelId, 160).toLowerCase().includes('nano-banana')

export const normalizeImageProviderProfile = (rawProfile = {}, index = 0) => {
  const fallback = DEFAULT_IMAGE_PROVIDER_PROFILES[index] || DEFAULT_IMAGE_PROVIDER_PROFILES[0]
  const now = Date.now()
  return {
    id: trimText(rawProfile.id, 140) || fallback?.id || createImageProfileId(),
    name: trimText(rawProfile.name, 80) || fallback?.name || `Image provider ${index + 1}`,
    endpoint: normalizeImageHttpUrl(rawProfile.endpoint) || fallback?.endpoint || '',
    adapterKind: normalizeImageAdapterKind(rawProfile.adapterKind || fallback?.adapterKind),
    modelId: trimText(rawProfile.modelId, 160) || fallback?.modelId || '',
    useProxy: rawProfile.useProxy === true,
    proxyUrl: normalizeImageHttpUrl(rawProfile.proxyUrl),
    enabled: rawProfile.enabled !== false,
    createdAt: normalizeTimestamp(rawProfile.createdAt, now),
    updatedAt: normalizeTimestamp(rawProfile.updatedAt, now),
  }
}

export const normalizeImageProviderProfiles = (rawProfiles) => {
  const source = Array.isArray(rawProfiles) && rawProfiles.length > 0
    ? rawProfiles
    : DEFAULT_IMAGE_PROVIDER_PROFILES
  const output = []
  const seen = new Set()
  source.slice(0, IMAGE_GENERATION_LIMITS.maxProfiles).forEach((profile, index) => {
    const normalized = normalizeImageProviderProfile(profile, index)
    if (!normalized.id || seen.has(normalized.id)) return
    seen.add(normalized.id)
    output.push(normalized)
  })
  return output
}

export const resolveImageAdapterKind = (profile = {}) => {
  const configured = normalizeImageAdapterKind(profile.adapterKind)
  if (configured !== IMAGE_ADAPTER_KIND.AUTO) return configured
  if (isGrsaiImageEndpoint(profile.endpoint)) return IMAGE_ADAPTER_KIND.GRSAI_ASYNC
  if (isGptImageModelId(profile.modelId)) return IMAGE_ADAPTER_KIND.OPENAI_IMAGES
  return IMAGE_ADAPTER_KIND.OPENAI_CHAT_IMAGE
}

const isCompleteImageEndpoint = (endpoint) => {
  const path = getImageEndpointPath(endpoint)
  if (path.includes('/draw/') && !path.endsWith('/draw/result')) return true
  return COMPLETE_ENDPOINT_SUFFIXES.some((suffix) => path.endsWith(suffix))
}

const appendEndpointSuffix = (endpoint, suffixSegments) => {
  try {
    const url = new URL(endpoint)
    const segments = url.pathname.split('/').filter(Boolean)
    const normalized = segments.map((segment) => segment.toLowerCase())
    const base = normalized.at(-1) === 'v1' ? segments : [...segments, 'v1']
    url.pathname = `/${[...base, ...suffixSegments].join('/')}`
    return url.href
  } catch {
    return ''
  }
}

export const resolveImageGenerationEndpoint = (
  profile = {},
  { hasReferences = false } = {},
) => {
  const endpoint = normalizeImageHttpUrl(profile.endpoint)
  if (!endpoint) return ''
  if (isCompleteImageEndpoint(endpoint)) return endpoint

  const adapterKind = resolveImageAdapterKind(profile)
  if (adapterKind === IMAGE_ADAPTER_KIND.GRSAI_ASYNC) {
    try {
      const url = new URL(endpoint)
      const path = getImageEndpointPath(endpoint)
      if (path.endsWith('/v1')) url.pathname = `${url.pathname.replace(/\/+$/, '')}/api/generate`
      else url.pathname = `${url.pathname.replace(/\/+$/, '')}/v1/api/generate`
      return url.href
    } catch {
      return ''
    }
  }
  if (adapterKind === IMAGE_ADAPTER_KIND.OPENAI_IMAGES) {
    return appendEndpointSuffix(endpoint, hasReferences ? ['images', 'edits'] : ['images', 'generations'])
  }
  return appendEndpointSuffix(endpoint, ['chat', 'completions'])
}

const stripKnownEndpointSuffix = (pathname) => {
  const segments = pathname.split('/').filter(Boolean)
  const normalized = segments.map((segment) => segment.toLowerCase())
  const lastTwo = normalized.slice(-2).join('/')
  if (['chat/completions', 'images/generations', 'images/edits', 'api/generate'].includes(lastTwo)) {
    return segments.slice(0, -2)
  }
  if (
    ['models', 'model', 'completions', 'generate', 'generations', 'edits', 'responses'].includes(
      normalized.at(-1),
    )
  ) {
    return segments.slice(0, -1)
  }
  return segments
}

export const resolveImageModelEndpointCandidates = (endpoint) => {
  const normalized = normalizeImageHttpUrl(endpoint)
  if (!normalized) return []
  try {
    const url = new URL(normalized)
    const baseSegments = stripKnownEndpointSuffix(url.pathname)
    const normalizedBase = baseSegments.map((segment) => segment.toLowerCase())
    const versionedBase = normalizedBase.at(-1) === 'v1' ? baseSegments : [...baseSegments, 'v1']
    const candidates = ['models', 'model', 'models/list', 'model/list', 'list/models']
    return candidates.map((suffix) => {
      const candidate = new URL(url.href)
      candidate.pathname = `/${[...versionedBase, ...suffix.split('/')].join('/')}`
      return candidate.href
    })
  } catch {
    return []
  }
}

export const inferImageModelCapability = (modelId, endpoint = '') => {
  const normalized = trimText(modelId, 160).toLowerCase()
  const isGptImage = isGptImageModelId(normalized)
  const isNanoBanana = isNanoBananaModelId(normalized)
  const isLjqclub = isLjqclubImageEndpoint(endpoint)
  return {
    supportsImageGeneration: Boolean(normalized),
    supportsReferences: isGptImage || isNanoBanana,
    maxInputImages: isGptImage || isNanoBanana ? 4 : 0,
    maxGenerations: 4,
    supportedAspectRatios: [...IMAGE_ASPECT_RATIOS],
    supportedResolutions: isLjqclub && isGptImage ? [] : [...IMAGE_RESOLUTIONS],
    defaultAspectRatio: isLjqclub && isGptImage ? '4:5' : isNanoBanana ? '21:9' : '1:1',
    defaultResolution: isLjqclub && isGptImage ? '' : '1K',
    sizeMode: isLjqclub && isGptImage ? 'ratio_only' : 'ratio_and_resolution',
  }
}

export const normalizeImageGenerationDefaults = (rawDefaults = {}, profiles = []) => {
  const activeProfileId = trimText(rawDefaults.activeProfileId, 140)
  const resolvedProfileId = profiles.some((profile) => profile.id === activeProfileId)
    ? activeProfileId
    : profiles[0]?.id || ''
  return {
    activeProfileId: resolvedProfileId,
    aspectRatio: IMAGE_ASPECT_RATIOS.includes(rawDefaults.aspectRatio)
      ? rawDefaults.aspectRatio
      : '1:1',
    resolution: IMAGE_RESOLUTIONS.includes(rawDefaults.resolution)
      ? rawDefaults.resolution
      : '1K',
    count: Math.min(4, Math.max(1, Math.floor(Number(rawDefaults.count) || 1))),
  }
}

export const normalizeImageModuleRouting = (rawRouting = {}, profiles = []) => {
  const profileIds = new Set(profiles.map((profile) => profile.id))
  return Object.fromEntries(
    ['camera', 'chat', 'community', 'map'].map((moduleKey) => {
      const input = rawRouting?.[moduleKey] || {}
      const profileId = trimText(input.profileId, 140)
      return [
        moduleKey,
        {
          mode: input.mode === 'profile' && profileIds.has(profileId) ? 'profile' : 'default',
          profileId: profileIds.has(profileId) ? profileId : '',
        },
      ]
    }),
  )
}

export const buildImageGenerationRequest = (input = {}, profile = {}) => {
  const errors = []
  const prompt = trimText(input.prompt, 12000)
  const referenceUrls = Array.isArray(input.referenceUrls)
    ? input.referenceUrls
        .map((value) => trimText(value, 8_000_000))
        .filter((value) => value.startsWith('data:image/') || Boolean(normalizeImageHttpUrl(value)))
        .slice(0, IMAGE_GENERATION_LIMITS.maxReferences)
    : []
  if (!prompt) errors.push({ code: 'PROMPT_REQUIRED', path: 'prompt' })
  if (!normalizeImageHttpUrl(profile.endpoint)) {
    errors.push({ code: 'ENDPOINT_INVALID', path: 'profile.endpoint' })
  }
  if (!trimText(profile.modelId, 160)) errors.push({ code: 'MODEL_REQUIRED', path: 'profile.modelId' })

  const capability = inferImageModelCapability(profile.modelId, profile.endpoint)
  if (referenceUrls.length > capability.maxInputImages) {
    errors.push({ code: 'REFERENCE_LIMIT_EXCEEDED', path: 'referenceUrls' })
  }

  const aspectRatio = IMAGE_ASPECT_RATIOS.includes(input.aspectRatio)
    ? input.aspectRatio
    : capability.defaultAspectRatio
  const resolution = capability.supportedResolutions.includes(input.resolution)
    ? input.resolution
    : capability.defaultResolution
  return {
    ok: errors.length === 0,
    errors,
    value: {
      requestId: trimText(input.requestId, 160) || createImageRequestId(),
      source: {
        moduleKey: trimText(input.source?.moduleKey, 64) || 'camera',
        recordId: trimText(input.source?.recordId, 160),
      },
      intent: trimText(input.intent, 64) || (referenceUrls.length > 0 ? 'reference' : 'create'),
      prompt,
      referenceUrls,
      aspectRatio,
      resolution,
      count: Math.min(capability.maxGenerations, Math.max(1, Math.floor(Number(input.count) || 1))),
    },
  }
}

export const scaleGeminiImageSize = (aspectRatio, resolution = '1K') => {
  const base = GEMINI_SIZE_MAP[aspectRatio] || GEMINI_SIZE_MAP['1:1']
  const match = base.match(/^(\d+)x(\d+)$/)
  if (!match) return base
  const multiplier = resolution === '4K' ? 4 : resolution === '2K' ? 2 : 1
  return `${Number(match[1]) * multiplier}x${Number(match[2]) * multiplier}`
}

export const resolveGrsaiGptImageSize = (aspectRatio, resolution = '1K') => {
  const sizeMap = GRSAI_GPT_SIZE_MAP[resolution] || GRSAI_GPT_SIZE_MAP['1K']
  return sizeMap[aspectRatio] || sizeMap['1:1']
}

export const resolveOpenAiImageSize = (aspectRatio, resolution = '1K') => {
  const explicitSize = String(aspectRatio || '').match(/^(\d+)x(\d+)$/i)
  let width
  let height
  if (explicitSize) {
    width = Number(explicitSize[1])
    height = Number(explicitSize[2])
  } else {
    const ratioMatch = String(aspectRatio || '').match(/^(\d+(?:\.\d+)?):(\d+(?:\.\d+)?)$/)
    const ratioWidth = Number(ratioMatch?.[1]) || 1
    const ratioHeight = Number(ratioMatch?.[2]) || 1
    const targetPixels = resolution === '4K'
      ? OPENAI_IMAGE_MAX_PIXELS
      : resolution === '2K'
        ? 2048 * 2048
        : 1024 * 1024
    const scale = Math.sqrt(targetPixels / (ratioWidth * ratioHeight))
    width = ratioWidth * scale
    height = ratioHeight * scale
  }

  if (width / height > OPENAI_IMAGE_MAX_SIDE_RATIO) height = width / OPENAI_IMAGE_MAX_SIDE_RATIO
  if (height / width > OPENAI_IMAGE_MAX_SIDE_RATIO) width = height / OPENAI_IMAGE_MAX_SIDE_RATIO

  const maxEdge = Math.max(width, height)
  if (maxEdge > OPENAI_IMAGE_MAX_EDGE) {
    const scale = OPENAI_IMAGE_MAX_EDGE / maxEdge
    width *= scale
    height *= scale
  }

  const pixels = width * height
  if (pixels > OPENAI_IMAGE_MAX_PIXELS) {
    const scale = Math.sqrt(OPENAI_IMAGE_MAX_PIXELS / pixels)
    width *= scale
    height *= scale
  } else if (pixels < OPENAI_IMAGE_MIN_PIXELS) {
    const scale = Math.sqrt(OPENAI_IMAGE_MIN_PIXELS / pixels)
    width *= scale
    height *= scale
  }

  const roundToUnit = (value) =>
    Math.max(OPENAI_IMAGE_SIZE_UNIT, Math.round(value / OPENAI_IMAGE_SIZE_UNIT) * OPENAI_IMAGE_SIZE_UNIT)
  width = roundToUnit(width)
  height = roundToUnit(height)

  for (let index = 0; index < 8; index += 1) {
    const currentPixels = width * height
    const currentMaxEdge = Math.max(width, height)
    if (currentMaxEdge <= OPENAI_IMAGE_MAX_EDGE && currentPixels <= OPENAI_IMAGE_MAX_PIXELS && currentPixels >= OPENAI_IMAGE_MIN_PIXELS) break
    const scale = currentPixels < OPENAI_IMAGE_MIN_PIXELS
      ? Math.sqrt(OPENAI_IMAGE_MIN_PIXELS / currentPixels)
      : Math.min(
          OPENAI_IMAGE_MAX_EDGE / currentMaxEdge,
          Math.sqrt(OPENAI_IMAGE_MAX_PIXELS / currentPixels),
        )
    width = roundToUnit(width * scale)
    height = roundToUnit(height * scale)
  }

  return `${width}x${height}`
}

export const pruneImageCandidates = (
  candidates,
  {
    now = Date.now(),
    maxAgeMs = IMAGE_GENERATION_LIMITS.candidateMaxAgeMs,
    maxCandidates = IMAGE_GENERATION_LIMITS.maxCandidates,
  } = {},
) => {
  const cutoff = now - maxAgeMs
  return (Array.isArray(candidates) ? candidates : [])
    .filter((candidate) => candidate && normalizeTimestamp(candidate.createdAt, 0) >= cutoff)
    .sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0))
    .slice(0, maxCandidates)
}
