import { createSeededRandom } from './random'
import { WORLD_CONTEXT_FAMILY } from './world-context'

export const EVENT_VARIANT_SOURCE = Object.freeze({
  BUILT_IN: 'built_in',
  USER: 'user',
  AI_GENERATED: 'ai_generated',
})

const normalizeText = (value, fallback = '', max = 240) => {
  if (typeof value !== 'string') return fallback
  const normalized = value.trim().replace(/\s+/g, ' ')
  if (!normalized) return fallback
  return normalized.slice(0, max)
}

const normalizeTemplateList = (templates) =>
  Array.isArray(templates)
    ? templates.map((item) => normalizeText(item, '', 360)).filter(Boolean)
    : []

const cloneValue = (value) => {
  if (Array.isArray(value)) return value.map((item) => cloneValue(item))
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, cloneValue(item)]))
  }
  return value
}

export const createBuiltInVariantPack = ({
  id,
  worldContext,
  moduleKeys = [],
  variantsByTemplateId = {},
  now = Date.now(),
} = {}) => {
  const contextId = normalizeText(worldContext?.id, `world_context_${WORLD_CONTEXT_FAMILY.DAILY}`, 180)
  return {
    id: normalizeText(id, `variant_pack_${contextId}_built_in`, 180),
    worldContextId: contextId,
    worldContextHash: normalizeText(contextId, 'built_in', 180),
    activeWorldBookIds: Array.isArray(worldContext?.activeWorldBookIds)
      ? worldContext.activeWorldBookIds.slice(0, 24)
      : [],
    source: EVENT_VARIANT_SOURCE.BUILT_IN,
    moduleKeys: Array.isArray(moduleKeys) ? moduleKeys.slice(0, 24) : [],
    templateIds: Object.keys(variantsByTemplateId),
    variantsByTemplateId: cloneValue(variantsByTemplateId),
    version: 1,
    createdAt: now,
    updatedAt: now,
  }
}

export const resolveWorldContextFamilyFromContext = (worldContext = {}) => {
  const genreTags = Array.isArray(worldContext.genreTags) ? worldContext.genreTags : []
  if (genreTags.includes(WORLD_CONTEXT_FAMILY.APOCALYPSE)) return WORLD_CONTEXT_FAMILY.APOCALYPSE
  if (genreTags.includes(WORLD_CONTEXT_FAMILY.SCI_FI)) return WORLD_CONTEXT_FAMILY.SCI_FI
  return WORLD_CONTEXT_FAMILY.DAILY
}

export const selectEventVariant = ({
  templateId,
  variantPack,
  worldContext,
  seed,
  randomValue,
} = {}) => {
  const normalizedTemplateId = normalizeText(templateId, '', 180)
  const variants = Array.isArray(variantPack?.variantsByTemplateId?.[normalizedTemplateId])
    ? variantPack.variantsByTemplateId[normalizedTemplateId]
    : []
  if (variants.length === 0) {
    return {
      variant: null,
      reason: 'variant_missing',
    }
  }

  const family = resolveWorldContextFamilyFromContext(worldContext)
  const matchingVariants = variants.filter((variant) =>
    Array.isArray(variant.worldScope) ? variant.worldScope.includes(family) : false,
  )
  const candidates = matchingVariants.length > 0 ? matchingVariants : variants
  const value =
    randomValue !== undefined
      ? Math.min(1, Math.max(0, Number(randomValue) || 0))
      : createSeededRandom(seed || `${normalizedTemplateId}:${variantPack?.id || ''}`)()
  const index = Math.min(candidates.length - 1, Math.floor(value * candidates.length))
  return {
    variant: cloneValue(candidates[index]),
    reason: matchingVariants.length > 0 ? 'world_variant_selected' : 'fallback_variant_selected',
  }
}

export const renderVariantTemplate = (template = '', values = {}) => {
  const normalizedTemplate = normalizeText(template, '', 420)
  if (!normalizedTemplate) return ''
  return normalizedTemplate.replace(/\{([a-zA-Z0-9_.-]+)\}/g, (_match, key) => {
    const value = values[key]
    if (value === undefined || value === null) return ''
    return String(value)
  })
}

export const renderEventVariantCopy = (variant = {}, values = {}, { seed, randomValue } = {}) => {
  const summaryTemplates = normalizeTemplateList(variant.summaryTemplates)
  const detailTemplates = normalizeTemplateList(variant.detailTemplates)
  const pickTemplate = (templates) => {
    if (templates.length === 0) return ''
    const value =
      randomValue !== undefined
        ? Math.min(1, Math.max(0, Number(randomValue) || 0))
        : createSeededRandom(seed || variant.id || templates[0])()
    return templates[Math.min(templates.length - 1, Math.floor(value * templates.length))]
  }

  return {
    title: normalizeText(variant.title, '', 120),
    summary: renderVariantTemplate(pickTemplate(summaryTemplates), values),
    detail: renderVariantTemplate(pickTemplate(detailTemplates), values),
  }
}
