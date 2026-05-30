import { resolveWorldviewText } from '../world-interface'

const WORLD_CONTEXT_VERSION = 1

export const WORLD_CONTEXT_SOURCE = Object.freeze({
  DEFAULT: 'default',
  WORLDBOOK_BINDING: 'worldbook_binding',
  MANUAL: 'manual',
  AI_GENERATED_SUMMARY: 'ai_generated_summary',
})

export const WORLD_CONTEXT_FAMILY = Object.freeze({
  DAILY: 'daily',
  SCI_FI: 'sci_fi',
  APOCALYPSE: 'apocalypse',
})

const WORLD_CONTEXT_FAMILY_VALUES = new Set(Object.values(WORLD_CONTEXT_FAMILY))

const normalizeText = (value, fallback = '', max = 240) => {
  if (typeof value !== 'string') return fallback
  const normalized = value.trim().replace(/\s+/g, ' ')
  if (!normalized) return fallback
  return normalized.slice(0, max)
}

const normalizeTag = (value, fallback = '', max = 40) =>
  normalizeText(value, fallback, max).toLowerCase().replace(/[\s-]+/g, '_')

const uniqueTags = (items = [], maxItems = 12) => {
  if (!Array.isArray(items)) return []
  const output = []
  items.forEach((item) => {
    const tag = normalizeTag(item)
    if (!tag || output.includes(tag)) return
    output.push(tag)
  })
  return output.slice(0, maxItems)
}

const collectText = ({ globalWorldview = '', knowledgePoints = [] } = {}) => {
  const pointText = Array.isArray(knowledgePoints)
    ? knowledgePoints
        .map((point) => `${point?.title || ''} ${point?.content || ''} ${(point?.tags || []).join(' ')}`)
        .join(' ')
    : ''
  return `${globalWorldview || ''} ${pointText}`.toLowerCase()
}

const containsAny = (text, patterns = []) => patterns.some((pattern) => pattern.test(text))

export const resolveWorldContextFamily = ({ globalWorldview = '', knowledgePoints = [] } = {}) => {
  const text = collectText({ globalWorldview, knowledgePoints })
  const tagText = Array.isArray(knowledgePoints)
    ? knowledgePoints.flatMap((point) => (Array.isArray(point?.tags) ? point.tags : [])).join(' ').toLowerCase()
    : ''

  if (
    containsAny(`${text} ${tagText}`, [
      /apocalypse/,
      /post[-_\s]?apocalyptic/,
      /末世/,
      /废土/,
      /避难所/,
      /封锁/,
      /补给/,
      /感染/,
    ])
  ) {
    return WORLD_CONTEXT_FAMILY.APOCALYPSE
  }

  if (
    containsAny(`${text} ${tagText}`, [
      /sci[-_\s]?fi/,
      /science fiction/,
      /cyberpunk/,
      /科幻/,
      /赛博/,
      /无人机/,
      /轨道/,
      /太空/,
      /高科技/,
      /\bai\b/,
    ])
  ) {
    return WORLD_CONTEXT_FAMILY.SCI_FI
  }

  return WORLD_CONTEXT_FAMILY.DAILY
}

const buildContextId = (family, activeWorldBookIds = []) => {
  const ids = activeWorldBookIds.length > 0 ? activeWorldBookIds.join('_') : 'global'
  return `world_context_${family}_${ids}`.replace(/[^a-zA-Z0-9_.-]/g, '_').slice(0, 180)
}

export const normalizeWorldContext = (rawContext = {}) => {
  const source = normalizeText(rawContext.source, WORLD_CONTEXT_SOURCE.DEFAULT, 40)
  const genreTags = uniqueTags(rawContext.genreTags)
  const family = WORLD_CONTEXT_FAMILY_VALUES.has(genreTags[0])
    ? genreTags[0]
    : resolveWorldContextFamily({
        globalWorldview: rawContext.summary || rawContext.globalWorldview,
        knowledgePoints: rawContext.knowledgePoints,
      })
  const activeWorldBookIds = uniqueTags(rawContext.activeWorldBookIds, 24)

  return {
    id: normalizeText(rawContext.id, buildContextId(family, activeWorldBookIds), 180),
    source,
    activeWorldBookIds,
    sourceScope: normalizeText(rawContext.sourceScope, 'global', 40),
    genreTags: uniqueTags([family, ...genreTags]),
    toneTags: uniqueTags(rawContext.toneTags),
    techLevel: normalizeText(rawContext.techLevel, family === WORLD_CONTEXT_FAMILY.SCI_FI ? 'high' : 'normal', 40),
    dangerLevel: normalizeText(
      rawContext.dangerLevel,
      family === WORLD_CONTEXT_FAMILY.APOCALYPSE ? 'high' : 'low',
      40,
    ),
    socialOrder: normalizeText(
      rawContext.socialOrder,
      family === WORLD_CONTEXT_FAMILY.APOCALYPSE ? 'unstable' : 'stable',
      40,
    ),
    economyMode: normalizeText(
      rawContext.economyMode,
      family === WORLD_CONTEXT_FAMILY.SCI_FI ? 'credits' : 'cash',
      40,
    ),
    magicLevel: normalizeText(rawContext.magicLevel, 'none', 40),
    locale: normalizeText(rawContext.locale, 'zh-CN', 20),
    version: WORLD_CONTEXT_VERSION,
    updatedAt: Math.max(0, Math.floor(Number(rawContext.updatedAt) || Date.now())),
  }
}

export const resolveWorldContextFromWorldBook = ({
  globalWorldview = '',
  knowledgePoints = [],
  sourceScope = 'global',
  locale = 'zh-CN',
  now = Date.now(),
} = {}) => {
  const enabledPoints = Array.isArray(knowledgePoints)
    ? knowledgePoints.filter((point) => point && point.enabled !== false)
    : []
  const family = resolveWorldContextFamily({
    globalWorldview,
    knowledgePoints: enabledPoints,
  })
  const activeWorldBookIds = enabledPoints.map((point) => point.id).filter(Boolean)
  return normalizeWorldContext({
    id: buildContextId(family, activeWorldBookIds),
    source: activeWorldBookIds.length > 0 || normalizeText(globalWorldview)
      ? WORLD_CONTEXT_SOURCE.WORLDBOOK_BINDING
      : WORLD_CONTEXT_SOURCE.DEFAULT,
    activeWorldBookIds,
    sourceScope,
    genreTags: [family],
    toneTags: family === WORLD_CONTEXT_FAMILY.APOCALYPSE ? ['tense', 'resourceful'] : [],
    techLevel: family === WORLD_CONTEXT_FAMILY.SCI_FI ? 'high' : 'normal',
    dangerLevel: family === WORLD_CONTEXT_FAMILY.APOCALYPSE ? 'high' : 'low',
    socialOrder: family === WORLD_CONTEXT_FAMILY.APOCALYPSE ? 'unstable' : 'stable',
    economyMode: family === WORLD_CONTEXT_FAMILY.SCI_FI ? 'credits' : 'cash',
    locale,
    updatedAt: now,
  })
}

export const resolveWorldContextFromSystemStore = (systemStore, options = {}) => {
  const user = systemStore?.user || {}
  const { bookStore, ...contextOptions } = options
  const globalWorldview = resolveWorldviewText(systemStore, { bookStore })
  const knowledgePoints =
    typeof systemStore?.listKnowledgePoints === 'function'
      ? systemStore.listKnowledgePoints({ enabledOnly: true })
      : user.knowledgePoints
  return resolveWorldContextFromWorldBook({
    globalWorldview,
    knowledgePoints,
    ...contextOptions,
  })
}
