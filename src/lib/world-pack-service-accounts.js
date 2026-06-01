import { normalizeWorldPack } from './world-pack-schema'
import { buildServiceAccountSourceNotificationPlan } from './service-account-source-plan'

const SERVICE_CATEGORY_KIND = Object.freeze({
  publication: 'official',
  subscription: 'official',
})

const MODULE_BINDING_RULES = Object.freeze({
  shopping: Object.freeze({
    field: 'shoppingServiceKey',
    value: 'daily_fresh',
    label: 'Shopping / Daily Fresh',
  }),
  food_delivery: Object.freeze({
    field: 'foodDeliveryServiceKey',
    value: 'food_delivery_dispatch',
    label: 'Food Delivery Dispatch',
  }),
  logistics: Object.freeze({
    field: 'logisticsServiceKey',
    value: 'standard_courier',
    label: 'Logistics / Standard Courier',
  }),
})

const ARCHETYPE_BINDING_RULES = Object.freeze({
  marketplace: MODULE_BINDING_RULES.shopping,
  dispatch: MODULE_BINDING_RULES.food_delivery,
  transit: MODULE_BINDING_RULES.logistics,
})

const normalizeText = (value, fallback = '', maxLength = 500) => {
  const text = typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : ''
  if (!text) return fallback
  return text.length > maxLength ? text.slice(0, maxLength) : text
}

export const resolveWorldServiceTemplateKind = (template = {}) => {
  const category = normalizeText(template.category, 'publication', 80).toLowerCase()
  return SERVICE_CATEGORY_KIND[category] || 'service'
}

export const findWorldServiceTemplateAppBinding = (pack = {}, template = {}) => {
  const linkedId = normalizeText(template.linkedAppBindingId, '', 120)
  const appBindings = Array.isArray(pack.appBindings) ? pack.appBindings : []
  if (!linkedId) return null
  return appBindings.find((binding) => binding?.id === linkedId) || null
}

export const resolveWorldServiceTemplateChatBinding = ({ template = {}, appBinding = null } = {}) => {
  if (!appBinding || appBinding.enabled === false) {
    return {
      field: '',
      value: '',
      label: '',
    }
  }

  const moduleKey = normalizeText(appBinding.moduleKey, '', 80).toLowerCase()
  const archetype = normalizeText(appBinding.archetype, '', 80).toLowerCase()
  const rule = MODULE_BINDING_RULES[moduleKey] || ARCHETYPE_BINDING_RULES[archetype] || null

  if (!rule) {
    return {
      field: '',
      value: '',
      label: normalizeText(appBinding.title || template.linkedAppBindingId, '', 120),
    }
  }

  return {
    ...rule,
  }
}

export const buildWorldServiceTemplateChatContactPayload = ({ pack, templateId } = {}) => {
  const normalizedPack = normalizeWorldPack(pack || {})
  const template = normalizedPack.serviceAccountTemplates.find(
    (item) => item.id === normalizeText(templateId, '', 120),
  )

  if (!template || template.enabled === false) return null

  const appBinding = findWorldServiceTemplateAppBinding(normalizedPack, template)
  const chatBinding = resolveWorldServiceTemplateChatBinding({ template, appBinding })
  const kind = resolveWorldServiceTemplateKind(template)
  const title = normalizeText(template.title || template.name, 'World service', 120)
  const packTitle = normalizeText(normalizedPack.title || normalizedPack.name, 'World Pack', 120)
  const description = normalizeText(template.description, '', 260)
  const bindingCopy = chatBinding.label ? ` Linked module: ${chatBinding.label}.` : ''
  const bio = normalizeText(
    `${description || 'Generated from the active World Pack.'} From ${packTitle}.${bindingCopy} Source modules keep business records.`,
    '',
    500,
  )

  return {
    name: title,
    kind,
    role: kind === 'official' ? 'Official' : 'Service',
    serviceTemplate: title,
    bio,
    shoppingServiceKey: chatBinding.field === 'shoppingServiceKey' ? chatBinding.value : '',
    logisticsServiceKey: chatBinding.field === 'logisticsServiceKey' ? chatBinding.value : '',
    foodDeliveryServiceKey: chatBinding.field === 'foodDeliveryServiceKey' ? chatBinding.value : '',
    worldPackId: normalizedPack.id,
    worldServiceTemplateId: template.id,
    worldAppBindingId: template.linkedAppBindingId || appBinding?.id || '',
  }
}

export const buildWorldServiceTemplateGenerationRows = ({ pack, findExistingContact } = {}) => {
  const normalizedPack = normalizeWorldPack(pack || {})
  return normalizedPack.serviceAccountTemplates
    .filter((template) => template.enabled !== false)
    .map((template) => {
      const payload = buildWorldServiceTemplateChatContactPayload({
        pack: normalizedPack,
        templateId: template.id,
      })
      const appBinding = findWorldServiceTemplateAppBinding(normalizedPack, template)
      const chatBinding = resolveWorldServiceTemplateChatBinding({ template, appBinding })
      const existingContact =
        typeof findExistingContact === 'function'
          ? findExistingContact(normalizedPack.id, template.id)
          : null
      const sourceNotificationPlan = buildServiceAccountSourceNotificationPlan(payload || {}, {
        subscriptionState: existingContact ? 'joined' : 'available',
      })

      return {
        id: template.id,
        title: template.title,
        name: template.name || template.title,
        packId: normalizedPack.id,
        packTitle: normalizedPack.title,
        packName: normalizedPack.name,
        category: template.category,
        description: template.description,
        kind: payload?.kind || 'service',
        linkedAppBindingId: template.linkedAppBindingId,
        linkedAppLabel: appBinding?.title || '',
        chatBindingLabel: chatBinding.label || '',
        source: template.source || '',
        proposalConfidence: template.proposalConfidence || '',
        proposalEvidence: template.proposalEvidence || '',
        confirmedAt: Number.isFinite(Number(template.confirmedAt))
          ? Math.max(0, Math.floor(Number(template.confirmedAt)))
          : 0,
        userEditedAt: Number.isFinite(Number(template.userEditedAt))
          ? Math.max(0, Math.floor(Number(template.userEditedAt)))
          : 0,
        sourceNotificationPlan,
        sourcePlanSummary: sourceNotificationPlan.summary,
        generated: Boolean(existingContact),
        contactId: existingContact?.id || 0,
        payload,
      }
    })
}

export const buildWorldServiceTemplateGenerationRowsForPacks = ({
  packs = [],
  findExistingContact,
} = {}) =>
  (Array.isArray(packs) ? packs : []).flatMap((pack) =>
    buildWorldServiceTemplateGenerationRows({ pack, findExistingContact }),
  )
