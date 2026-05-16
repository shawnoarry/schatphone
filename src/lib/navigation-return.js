const SETTINGS_RETURN_ROUTE = '/settings'
const HOME_RETURN_ROUTE = '/home'
const SOURCE_RETURN_TARGETS = Object.freeze({
  chat: '/chat',
  calendar: '/calendar',
  map: '/map',
})
const SOURCE_RETURN_LABELS = Object.freeze({
  chat: 'Chat',
  calendar: 'Calendar',
  map: 'Map',
})

const normalizeReturnSource = (source) => {
  const raw = typeof source === 'string' ? source.trim().toLowerCase() : ''
  if (raw === 'settings') return 'settings'
  if (raw === 'home') return 'home'
  return ''
}

export const normalizeHomePageQuery = (value) => {
  const raw = Array.isArray(value) ? value[0] : value
  if (typeof raw !== 'string' && typeof raw !== 'number') return ''

  const text = String(raw).trim()
  if (!/^\d+$/.test(text)) return ''

  const page = Number(text)
  if (!Number.isSafeInteger(page)) return ''
  return String(page)
}

const buildHomeReturnTarget = (route) => {
  const homePage = normalizeHomePageQuery(route?.query?.homePage)
  if (!homePage) return HOME_RETURN_ROUTE
  return {
    path: HOME_RETURN_ROUTE,
    query: { homePage },
  }
}

const buildSettingsReturnTarget = (route) => {
  const homePage = normalizeHomePageQuery(route?.query?.homePage)
  if (!homePage) return SETTINGS_RETURN_ROUTE
  return {
    path: SETTINGS_RETURN_ROUTE,
    query: { from: 'home', homePage },
  }
}

export const buildReturnSourceQuery = (source = 'home', route, query = {}) => {
  const normalizedSource = normalizeReturnSource(source)
  const nextQuery = { ...query }
  if (!normalizedSource) return nextQuery

  const homePage = normalizeHomePageQuery(route?.query?.homePage)
  return {
    ...nextQuery,
    from: normalizedSource,
    ...(homePage ? { homePage } : {}),
  }
}

export const buildHomeSourceQuery = (pageIndex = 0, query = {}) => {
  const homePage = normalizeHomePageQuery(pageIndex)
  return {
    ...query,
    from: 'home',
    ...(homePage ? { homePage } : {}),
  }
}

export const buildRouteWithReturnSource = (path, source = 'home', query = {}) => {
  const normalizedSource = normalizeReturnSource(source)
  const nextQuery = { ...query }
  if (normalizedSource === 'home') {
    const homePage = normalizeHomePageQuery(nextQuery.homePage)
    if (homePage) nextQuery.homePage = homePage
    else delete nextQuery.homePage
  }

  return {
    path,
    query: {
      ...nextQuery,
      ...(normalizedSource ? { from: normalizedSource } : {}),
    },
  }
}

export const resolveReturnTarget = (route, fallback = HOME_RETURN_ROUTE) => {
  const source = normalizeReturnSource(route?.query?.from)
  if (source === 'settings') return buildSettingsReturnTarget(route)
  if (source === 'home') return buildHomeReturnTarget(route)
  const routeSource =
    typeof route?.query?.source === 'string' ? route.query.source.trim().toLowerCase() : ''
  if (SOURCE_RETURN_TARGETS[routeSource]) return SOURCE_RETURN_TARGETS[routeSource]
  return fallback
}

export const pushReturnTarget = (router, route, fallback = HOME_RETURN_ROUTE) => {
  const target = resolveReturnTarget(route, fallback)
  router.push(target)
}

export const resolveReturnLabel = (route, fallback = 'Home') => {
  const source = normalizeReturnSource(route?.query?.from)
  if (source === 'settings') return 'Settings'
  if (source === 'home') return 'Home'
  const routeSource =
    typeof route?.query?.source === 'string' ? route.query.source.trim().toLowerCase() : ''
  if (SOURCE_RETURN_LABELS[routeSource]) return SOURCE_RETURN_LABELS[routeSource]
  return fallback
}
