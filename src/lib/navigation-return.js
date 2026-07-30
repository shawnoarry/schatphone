const SETTINGS_RETURN_ROUTE = '/settings'
const HOME_RETURN_ROUTE = '/home'
const SOURCE_RETURN_TARGETS = Object.freeze({
  chat: '/chat',
  calendar: '/calendar',
  map: '/map',
  'map-settings': '/map/settings',
  worldbook: '/worldbook',
  camera: '/camera',
})
const SOURCE_RETURN_LABELS = Object.freeze({
  chat: 'Chat',
  calendar: 'Calendar',
  map: 'Map',
  'map-settings': 'Map settings',
  worldbook: 'WorldBook',
  camera: 'Camera',
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

export const normalizeChatThreadIdQuery = (value) => {
  const raw = Array.isArray(value) ? value[0] : value
  if (typeof raw !== 'string' && typeof raw !== 'number') return ''

  const text = String(raw).trim()
  if (!/^\d+$/.test(text)) return ''

  const threadId = Number(text)
  if (!Number.isSafeInteger(threadId) || threadId <= 0) return ''
  return String(threadId)
}

export const normalizeContactsProfileIdQuery = (value) => {
  const raw = Array.isArray(value) ? value[0] : value
  if (typeof raw !== 'string' && typeof raw !== 'number') return ''

  const text = String(raw).trim()
  if (!/^\d+$/.test(text)) return ''

  const profileId = Number(text)
  if (!Number.isSafeInteger(profileId) || profileId <= 0) return ''
  return String(profileId)
}

const normalizeCrossModuleSource = (value) => {
  const raw = Array.isArray(value) ? value[0] : value
  return typeof raw === 'string' ? raw.trim().toLowerCase() : ''
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

export const resolveChatReturnTarget = (route) => {
  const routeSource = normalizeCrossModuleSource(route?.query?.source)
  if (routeSource !== 'chat') return null

  const chatId = normalizeChatThreadIdQuery(route?.query?.chatId)
  if (!chatId) return null

  const ancestorSource = normalizeCrossModuleSource(route?.query?.from)
  const profileId = normalizeContactsProfileIdQuery(route?.query?.profileId)
  if (ancestorSource === 'contacts' && profileId) {
    return {
      path: `/chat/${chatId}`,
      query: {
        source: 'contacts',
        profileId,
      },
    }
  }

  const homePage = normalizeHomePageQuery(route?.query?.homePage)
  return {
    path: `/chat/${chatId}`,
    ...(homePage ? { query: { from: 'home', homePage } } : {}),
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

export const buildChatReturnSourceQuery = (route, chatId, query = {}) => {
  const normalizedChatId = normalizeChatThreadIdQuery(chatId)
  const nextQuery = { ...query }
  if (!normalizedChatId) return nextQuery

  const source = normalizeCrossModuleSource(route?.query?.source)
  const profileId = normalizeContactsProfileIdQuery(route?.query?.profileId)
  const contactsAncestor = source === 'contacts' && profileId
  const homePage = normalizeHomePageQuery(route?.query?.homePage)
  return {
    ...nextQuery,
    source: 'chat',
    chatId: normalizedChatId,
    ...(contactsAncestor ? { from: 'contacts', profileId } : {}),
    ...(homePage ? { homePage } : {}),
  }
}

export const buildContactsChatSourceQuery = (profileId, query = {}) => {
  const normalizedProfileId = normalizeContactsProfileIdQuery(profileId)
  const nextQuery = { ...query }
  if (!normalizedProfileId) return nextQuery
  return {
    ...nextQuery,
    source: 'contacts',
    profileId: normalizedProfileId,
  }
}

export const resolveContactsReturnTarget = (route) => {
  const source = normalizeCrossModuleSource(route?.query?.source)
  if (source !== 'contacts') return null

  const profileId = normalizeContactsProfileIdQuery(route?.query?.profileId)
  if (!profileId) return null
  return {
    path: '/contacts',
    query: { profileId },
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
  const routeSource = normalizeCrossModuleSource(route?.query?.source)
  if (routeSource === 'chat') return resolveChatReturnTarget(route) || SOURCE_RETURN_TARGETS.chat
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
  const routeSource = normalizeCrossModuleSource(route?.query?.source)
  if (SOURCE_RETURN_LABELS[routeSource]) return SOURCE_RETURN_LABELS[routeSource]
  return fallback
}
