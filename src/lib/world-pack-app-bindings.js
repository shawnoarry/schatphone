import { normalizeWorldPack } from './world-pack-schema'

const MODULE_TARGET_LABELS = Object.freeze({
  chat: 'Chat Directory',
  shopping: 'Shopping',
  food_delivery: 'Food Delivery',
  calendar: 'Calendar',
  map: 'Map',
})

const SHOPPING_MARKETPLACE_RULE = Object.freeze({
  serviceKey: 'daily_fresh',
  serviceLabel: 'Daily Fresh',
  categoryKey: 'grocery',
  categoryLabel: 'Grocery',
})

const normalizeText = (value, fallback = '', maxLength = 500) => {
  const text = typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : ''
  if (!text) return fallback
  return text.length > maxLength ? text.slice(0, maxLength) : text
}

const normalizeQueryValue = (value) => {
  if (Array.isArray(value)) return normalizeText(value[0], '', 160)
  return normalizeText(value, '', 160)
}

const resolveActiveWorldPack = (systemStore) => {
  if (typeof systemStore?.getActiveWorldPack === 'function') {
    return systemStore.getActiveWorldPack()
  }
  const activePackId = normalizeText(systemStore?.user?.activeWorldPackId, 'default_world', 120)
  const packs = Array.isArray(systemStore?.user?.worldPacks) ? systemStore.user.worldPacks : []
  return packs.find((pack) => pack?.id === activePackId) || null
}

export const buildWorldAppBindingRows = ({ pack } = {}) => {
  const normalizedPack = normalizeWorldPack(pack || {})
  return normalizedPack.appBindings
    .filter((binding) => binding.enabled !== false)
    .map((binding) => {
      const route = normalizeText(binding.route, '', 160)
      return {
        id: binding.id,
        title: binding.title,
        description: binding.description,
        archetype: binding.archetype,
        moduleKey: binding.moduleKey,
        route,
        enabled: binding.enabled !== false,
        packId: normalizedPack.id,
        packTitle: normalizedPack.title,
        packName: normalizedPack.name,
        targetLabel: MODULE_TARGET_LABELS[binding.moduleKey] || binding.moduleKey || 'Module',
        launchable: Boolean(route),
        query: {
          worldPack: normalizedPack.id,
          worldApp: binding.id,
        },
        terminology: binding.terminology,
      }
    })
}

export const findWorldAppBindingForModule = ({ pack, moduleKey = '', routeQuery = {} } = {}) => {
  const normalizedPack = normalizeWorldPack(pack || {})
  const requestedPackId = normalizeQueryValue(routeQuery.worldPack)
  if (requestedPackId && requestedPackId !== normalizedPack.id) return null

  const requestedBindingId = normalizeQueryValue(routeQuery.worldApp)
  const normalizedModuleKey = normalizeText(moduleKey, '', 80).toLowerCase()
  const bindings = normalizedPack.appBindings.filter(
    (binding) => binding.enabled !== false && binding.moduleKey === normalizedModuleKey,
  )

  if (requestedBindingId) {
    return bindings.find((binding) => binding.id === requestedBindingId) || null
  }

  return bindings[0] || null
}

export const resolveShoppingWorldAppContext = ({ systemStore, routeQuery = {} } = {}) => {
  const activePack = resolveActiveWorldPack(systemStore)
  if (!activePack) return null
  const normalizedPack = normalizeWorldPack(activePack)
  const binding = findWorldAppBindingForModule({
    pack: normalizedPack,
    moduleKey: 'shopping',
    routeQuery,
  })
  if (!binding || binding.archetype !== 'marketplace') return null

  return {
    packId: normalizedPack.id,
    packTitle: normalizedPack.title,
    packName: normalizedPack.name,
    bindingId: binding.id,
    bindingTitle: binding.title,
    description: binding.description,
    archetype: binding.archetype,
    moduleKey: binding.moduleKey,
    route: binding.route || '/shopping',
    serviceKey: SHOPPING_MARKETPLACE_RULE.serviceKey,
    serviceLabel: SHOPPING_MARKETPLACE_RULE.serviceLabel,
    categoryKey: SHOPPING_MARKETPLACE_RULE.categoryKey,
    categoryLabel: SHOPPING_MARKETPLACE_RULE.categoryLabel,
    boundaryCopy:
      'Shopping keeps products, cart, checkout, orders, and downstream handoffs. The World Pack only changes entry context and filter defaults.',
  }
}

export const buildShoppingWorldAppFilterQuery = ({ context, currentQuery = {} } = {}) => {
  if (!context) return { ...currentQuery }
  return {
    ...currentQuery,
    worldPack: context.packId,
    worldApp: context.bindingId,
    service: context.serviceKey,
    category: context.categoryKey,
  }
}

