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

export const WORLD_APP_HOME_TILE_ID_PREFIX = 'world_app_'

const WORLD_APP_PRESENTATION_BY_ARCHETYPE = Object.freeze({
  publication_feed: { icon: 'fas fa-tower-broadcast', accent: 'cool' },
  marketplace: { icon: 'fas fa-store', accent: 'warm' },
  reservation: { icon: 'fas fa-calendar-check', accent: 'light' },
  transit: { icon: 'fas fa-route', accent: 'cool' },
  subscription: { icon: 'fas fa-id-card', accent: 'dark' },
  dispatch: { icon: 'fas fa-truck-medical', accent: 'cool' },
})

const WORLD_APP_PRESENTATION_BY_MODULE = Object.freeze({
  chat: { icon: 'fas fa-message', accent: 'default' },
  shopping: { icon: 'fas fa-bag-shopping', accent: 'warm' },
  food_delivery: { icon: 'fas fa-bowl-food', accent: 'warm' },
  calendar: { icon: 'fas fa-calendar-days', accent: 'light' },
  map: { icon: 'fas fa-map-location-dot', accent: 'cool' },
})

const normalizeText = (value, fallback = '', maxLength = 500) => {
  const text = typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : ''
  if (!text) return fallback
  return text.length > maxLength ? text.slice(0, maxLength) : text
}

const normalizeTileIdPart = (value, fallback = 'item') => {
  const text = normalizeText(value, fallback, 120).toLowerCase()
  const normalized = text.replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')
  return normalized || fallback
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

const resolveEnabledWorldPacks = (systemStore) => {
  if (typeof systemStore?.listEnabledWorldPacks === 'function') {
    return systemStore.listEnabledWorldPacks()
  }
  const activePack = resolveActiveWorldPack(systemStore)
  return activePack ? [activePack] : []
}

const resolveWorldAppPresentation = (row = {}) =>
  WORLD_APP_PRESENTATION_BY_ARCHETYPE[row.archetype] ||
  WORLD_APP_PRESENTATION_BY_MODULE[row.moduleKey] ||
  { icon: 'fas fa-globe', accent: 'default' }

const buildWorldAppUxBoundaryCopy = (targetLabel = 'target app') =>
  `${targetLabel} keeps its own records, workflows, and source-module truth. The World Pack only changes labels, terminology, accent, context banner, and safe default UX.`

export const buildWorldAppHomeTileId = ({ packId = '', bindingId = '' } = {}) =>
  `${WORLD_APP_HOME_TILE_ID_PREFIX}${normalizeTileIdPart(packId, 'pack')}_${normalizeTileIdPart(bindingId, 'app')}`

export const isWorldAppHomeTileId = (tileId) =>
  typeof tileId === 'string' && tileId.startsWith(WORLD_APP_HOME_TILE_ID_PREFIX)

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

export const buildWorldAppEntryRows = ({ pack } = {}) =>
  buildWorldAppBindingRows({ pack })
    .filter((row) => row.launchable)
    .map((row) => {
      const presentation = resolveWorldAppPresentation(row)
      const label = normalizeText(row.title, row.targetLabel || 'World App', 120)
      const packLabel = normalizeText(row.packName, row.packTitle || row.packId, 120)
      const description = normalizeText(
        row.description,
        `World Pack entry for ${row.targetLabel || row.moduleKey || 'module'}.`,
        280,
      )
      return {
        id: buildWorldAppHomeTileId({ packId: row.packId, bindingId: row.id }),
        bindingId: row.id,
        label,
        labelZh: label,
        labelEn: label,
        categoryZh: 'World',
        categoryEn: 'World',
        desc: description,
        descZh: description,
        descEn: description,
        icon: presentation.icon,
        accent: presentation.accent,
        toneClass: `accent-${presentation.accent}`,
        route: row.route,
        routeQuery: { ...row.query },
        entryKind: 'world_app',
        worldAppEntry: true,
        worldPackId: row.packId,
        worldPackTitle: row.packTitle,
        worldPackName: row.packName,
        worldPackLabel: packLabel,
        worldAppBindingId: row.id,
        archetype: row.archetype,
        moduleKey: row.moduleKey,
        targetLabel: row.targetLabel,
        terminology: row.terminology,
      }
    })

export const buildWorldAppEntryRowsForPacks = ({ packs = [] } = {}) =>
  (Array.isArray(packs) ? packs : []).flatMap((pack) => buildWorldAppEntryRows({ pack }))

export const buildActiveWorldAppEntryRows = ({ systemStore } = {}) =>
  buildWorldAppEntryRowsForPacks({ packs: resolveEnabledWorldPacks(systemStore) })

export const resolveWorldAppUxContext = ({
  systemStore,
  moduleKey = '',
  routeQuery = {},
  expectedArchetypes = [],
} = {}) => {
  const enabledPacks = resolveEnabledWorldPacks(systemStore)
  const requestedPackId = normalizeQueryValue(routeQuery.worldPack)
  const candidatePacks = requestedPackId
    ? enabledPacks.filter((pack) => normalizeWorldPack(pack).id === requestedPackId)
    : enabledPacks
  const allowedArchetypes = Array.isArray(expectedArchetypes)
    ? expectedArchetypes.filter((item) => typeof item === 'string' && item.trim())
    : []

  for (const pack of candidatePacks) {
    const normalizedPack = normalizeWorldPack(pack)
    const binding = findWorldAppBindingForModule({
      pack: normalizedPack,
      moduleKey,
      routeQuery,
    })
    if (!binding) continue
    if (allowedArchetypes.length > 0 && !allowedArchetypes.includes(binding.archetype)) continue

    const presentation = resolveWorldAppPresentation(binding)
    const targetLabel = MODULE_TARGET_LABELS[binding.moduleKey] || binding.moduleKey || 'Module'
    return {
      packId: normalizedPack.id,
      packTitle: normalizedPack.title,
      packName: normalizedPack.name,
      bindingId: binding.id,
      bindingTitle: binding.title,
      description: binding.description,
      archetype: binding.archetype,
      moduleKey: binding.moduleKey,
      route: binding.route || '',
      routeQuery: {
        worldPack: normalizedPack.id,
        worldApp: binding.id,
      },
      targetLabel,
      icon: presentation.icon,
      accent: presentation.accent,
      terminology: binding.terminology || {},
      uxPackage: {
        labels: true,
        terminology: true,
        accent: true,
        contextBanner: true,
        safeDefaults: true,
      },
      boundaryCopy: buildWorldAppUxBoundaryCopy(targetLabel),
    }
  }

  return null
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
  const context = resolveWorldAppUxContext({
    systemStore,
    moduleKey: 'shopping',
    routeQuery,
    expectedArchetypes: ['marketplace'],
  })
  if (!context) return null

  return {
    ...context,
    route: context.route || '/shopping',
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
