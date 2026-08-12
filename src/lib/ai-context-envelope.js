export const AI_CONTEXT_ENVELOPE_VERSION = 1

const normalizeBlockText = (block) => {
  const value = typeof block === 'string' ? block : block?.text
  return typeof value === 'string' ? value.trim() : ''
}

const joinBlocks = (blocks = []) =>
  (Array.isArray(blocks) ? blocks : [])
    .map(normalizeBlockText)
    .filter(Boolean)
    .join('\n\n')

const normalizeCachePart = (value, fallback) => {
  const normalized = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._:-]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return normalized || fallback
}

const hashCacheIdentity = (value) => {
  const source = String(value || 'default')
  let hash = 2166136261
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return `id-${(hash >>> 0).toString(16).padStart(8, '0')}`
}

const buildStableCacheIdentity = (identity, stablePrefix) =>
  `${String(identity || 'default')}\n${String(stablePrefix || '')}`

const buildCacheKey = ({ namespace, identity, version }) => {
  const normalizedNamespace = normalizeCachePart(namespace, 'shared')
  const opaqueIdentity = hashCacheIdentity(identity)
  const normalizedVersion = Math.max(
    1,
    Math.floor(Number(version) || AI_CONTEXT_ENVELOPE_VERSION),
  )
  return `schatphone:${normalizedNamespace}:v${normalizedVersion}:${opaqueIdentity}`.slice(0, 64)
}

export const createAiContextEnvelope = (input = {}) => {
  const source = input && typeof input === 'object' && !Array.isArray(input) ? input : {}
  const {
    stableBlocks = [],
    dynamicBlocks = [],
    cacheNamespace = 'shared',
    cacheIdentity = 'default',
    cacheVersion = AI_CONTEXT_ENVELOPE_VERSION,
  } = source
  const stablePrefix = joinBlocks(stableBlocks)
  const dynamicContext = joinBlocks(dynamicBlocks)
  const systemPrompt = [stablePrefix, dynamicContext].filter(Boolean).join('\n\n')
  const opaqueCacheIdentity = hashCacheIdentity(cacheIdentity)
  const stableFingerprint = stablePrefix ? hashCacheIdentity(stablePrefix) : ''
  const cacheKey = stablePrefix
    ? buildCacheKey({
        namespace: cacheNamespace,
        identity: buildStableCacheIdentity(cacheIdentity, stablePrefix),
        version: cacheVersion,
      })
    : ''

  return Object.freeze({
    stablePrefix,
    dynamicContext,
    systemPrompt,
    cache: Object.freeze({
      namespace: normalizeCachePart(cacheNamespace, 'shared'),
      identity: opaqueCacheIdentity,
      stableFingerprint,
      version: Math.max(1, Math.floor(Number(cacheVersion) || AI_CONTEXT_ENVELOPE_VERSION)),
      key: cacheKey,
    }),
  })
}

export const resolveAiContextEnvelope = (systemPrompt = '', contextEnvelope = null) => {
  const fallbackPrompt = typeof systemPrompt === 'string' ? systemPrompt : ''
  const stablePrefix = normalizeBlockText(contextEnvelope?.stablePrefix)
  if (!stablePrefix) {
    return {
      stablePrefix: '',
      dynamicContext: '',
      systemPrompt: fallbackPrompt,
      cacheKey: '',
    }
  }

  const dynamicContext = normalizeBlockText(contextEnvelope?.dynamicContext)
  return {
    stablePrefix,
    dynamicContext,
    systemPrompt: [stablePrefix, dynamicContext].filter(Boolean).join('\n\n'),
    cacheKey: normalizeBlockText(contextEnvelope?.cache?.key || contextEnvelope?.cacheKey),
  }
}
