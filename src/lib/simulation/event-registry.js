import { createSeededRandom } from './random'
import {
  cloneEventValue,
  normalizeEventId,
  normalizeEventTemplateV2,
  normalizeEventVariantPackV1,
} from './event-contracts'

export const EVENT_REGISTRY_ERROR = Object.freeze({
  TEMPLATE_INVALID: 'EVENT_TEMPLATE_INVALID',
  TEMPLATE_DUPLICATE: 'EVENT_TEMPLATE_DUPLICATE',
  TEMPLATE_NOT_REGISTERED: 'EVENT_TEMPLATE_NOT_REGISTERED',
  ADAPTER_NOT_ALLOWLISTED: 'EVENT_ADAPTER_NOT_ALLOWLISTED',
  VARIANT_PACK_INVALID: 'EVENT_VARIANT_PACK_INVALID',
  VARIANT_PACK_DUPLICATE: 'EVENT_VARIANT_PACK_DUPLICATE',
  VARIANT_TEMPLATE_MISMATCH: 'EVENT_VARIANT_TEMPLATE_MISMATCH',
  VARIANT_COPY_INCOMPLETE: 'EVENT_VARIANT_COPY_INCOMPLETE',
  VARIANT_NOT_FOUND: 'EVENT_VARIANT_NOT_FOUND',
})

const clone = (value) => cloneEventValue(value)

const createResult = (record, errors = []) => ({
  ok: errors.length === 0,
  record: errors.length === 0 ? clone(record) : null,
  errors,
})

const validateTemplateAdapters = (template, allowedAdapterKeys) => {
  if (!(allowedAdapterKeys instanceof Set) || allowedAdapterKeys.size === 0) return []
  return template.choices.flatMap((choice, index) =>
    allowedAdapterKeys.has(choice.effectRequest.adapterKey)
      ? []
      : [
          {
            code: EVENT_REGISTRY_ERROR.ADAPTER_NOT_ALLOWLISTED,
            path: `choices.${index}.effectRequest.adapterKey`,
          },
        ],
  )
}

export const createEventTemplateRegistry = (initialTemplates = [], { adapterKeys = [] } = {}) => {
  const records = new Map()
  const allowedAdapterKeys = new Set(
    (Array.isArray(adapterKeys) ? adapterKeys : [])
      .map((item) => normalizeEventId(item))
      .filter(Boolean),
  )

  const register = (rawTemplate) => {
    const template = normalizeEventTemplateV2(rawTemplate)
    if (!template) {
      return createResult(null, [{ code: EVENT_REGISTRY_ERROR.TEMPLATE_INVALID, path: 'template' }])
    }
    if (records.has(template.id)) {
      return createResult(null, [{ code: EVENT_REGISTRY_ERROR.TEMPLATE_DUPLICATE, path: 'id' }])
    }
    const errors = validateTemplateAdapters(template, allowedAdapterKeys)
    if (errors.length > 0) return createResult(null, errors)
    records.set(template.id, template)
    return createResult(template)
  }

  const initialErrors = []
  ;(Array.isArray(initialTemplates) ? initialTemplates : []).forEach((template) => {
    const result = register(template)
    if (!result.ok) initialErrors.push(...result.errors)
  })

  const get = (templateId) => {
    const template = records.get(normalizeEventId(templateId))
    return template ? clone(template) : null
  }

  const list = () =>
    [...records.values()].sort((left, right) => left.id.localeCompare(right.id)).map(clone)

  return {
    initialErrors,
    register,
    unregister: (templateId) => records.delete(normalizeEventId(templateId)),
    get,
    list,
  }
}

const validateVariantCopy = (variant, template, templatePath) => {
  const expectedChoiceIds = template.choices.map((choice) => choice.id).sort()
  const expectedOutcomeIds = template.choices.map((choice) => choice.outcomeId).sort()
  const actualChoiceIds = Object.keys(variant.localCopy.choicesById).sort()
  const actualOutcomeIds = Object.keys(variant.localCopy.consequencesByOutcomeId).sort()
  if (
    expectedChoiceIds.length !== actualChoiceIds.length ||
    expectedChoiceIds.some((id, index) => id !== actualChoiceIds[index]) ||
    expectedOutcomeIds.length !== actualOutcomeIds.length ||
    expectedOutcomeIds.some((id, index) => id !== actualOutcomeIds[index])
  ) {
    return [
      {
        code: EVENT_REGISTRY_ERROR.VARIANT_COPY_INCOMPLETE,
        path: templatePath,
      },
    ]
  }
  return []
}

export const createEventVariantPackRegistry = (
  initialPacks = [],
  { templateRegistry = null } = {},
) => {
  const records = new Map()

  const register = (rawPack) => {
    const pack = normalizeEventVariantPackV1(rawPack)
    if (!pack) {
      return createResult(null, [
        { code: EVENT_REGISTRY_ERROR.VARIANT_PACK_INVALID, path: 'variantPack' },
      ])
    }
    if (records.has(pack.id)) {
      return createResult(null, [{ code: EVENT_REGISTRY_ERROR.VARIANT_PACK_DUPLICATE, path: 'id' }])
    }
    const errors = []
    Object.entries(pack.templateVariants).forEach(([templateId, variants]) => {
      const template = templateRegistry?.get?.(templateId)
      if (!template) {
        errors.push({
          code: EVENT_REGISTRY_ERROR.TEMPLATE_NOT_REGISTERED,
          path: `templateVariants.${templateId}`,
        })
        return
      }
      variants.forEach((variant, index) => {
        errors.push(
          ...validateVariantCopy(
            variant,
            template,
            `templateVariants.${templateId}.${index}.localCopy`,
          ),
        )
      })
    })
    if (errors.length > 0) return createResult(null, errors)
    records.set(pack.id, pack)
    return createResult(pack)
  }

  const initialErrors = []
  ;(Array.isArray(initialPacks) ? initialPacks : []).forEach((pack) => {
    const result = register(pack)
    if (!result.ok) initialErrors.push(...result.errors)
  })

  const get = (packId) => {
    const pack = records.get(normalizeEventId(packId))
    return pack ? clone(pack) : null
  }

  const list = () =>
    [...records.values()].sort((left, right) => left.id.localeCompare(right.id)).map(clone)

  const resolveVariant = ({ packId, templateId, placeCategoryId = '', seed = '' } = {}) => {
    const pack = records.get(normalizeEventId(packId))
    const normalizedTemplateId = normalizeEventId(templateId)
    if (!pack || !normalizedTemplateId) {
      return {
        ok: false,
        variant: null,
        pack: pack ? clone(pack) : null,
        reason: EVENT_REGISTRY_ERROR.VARIANT_NOT_FOUND,
      }
    }
    const variants = Array.isArray(pack.templateVariants[normalizedTemplateId])
      ? pack.templateVariants[normalizedTemplateId]
      : []
    const categoryId = normalizeEventId(placeCategoryId)
    const categoryMatches = variants.filter(
      (variant) =>
        variant.placeCategoryIds.length === 0 || variant.placeCategoryIds.includes(categoryId),
    )
    const candidates = categoryMatches.length > 0 ? categoryMatches : []
    if (candidates.length === 0) {
      return {
        ok: false,
        variant: null,
        pack: clone(pack),
        reason: EVENT_REGISTRY_ERROR.VARIANT_NOT_FOUND,
      }
    }
    const random = createSeededRandom(seed || `${pack.id}:${normalizedTemplateId}:${categoryId}`)
    const index = Math.min(candidates.length - 1, Math.floor(random() * candidates.length))
    return {
      ok: true,
      variant: clone(candidates[index]),
      pack: clone(pack),
      reason: 'variant_selected',
    }
  }

  return {
    initialErrors,
    register,
    unregister: (packId) => records.delete(normalizeEventId(packId)),
    get,
    list,
    resolveVariant,
  }
}
