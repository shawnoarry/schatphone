const SETTINGS_RETURN_ROUTE = '/settings'
const HOME_RETURN_ROUTE = '/home'
const SOURCE_RETURN_TARGETS = Object.freeze({
  chat: '/chat',
  calendar: '/calendar',
  'agenda-journey': '/agenda-journey',
  map: '/map',
  'map-settings': '/map/settings',
  worldbook: '/worldbook',
  camera: '/camera',
  mail: '/mail',
  browser: '/browser',
  healthcare: '/healthcare',
  housing: '/housing',
  workplace: '/workplace',
  fandom: '/fandom',
  tickets: '/tickets',
  travel: '/travel',
  intercity: '/intercity',
  'creator-rights': '/creator-rights',
  parcel: '/parcel',
  career: '/career',
})
const SOURCE_RETURN_LABELS = Object.freeze({
  chat: 'Chat',
  calendar: 'Calendar',
  'agenda-journey': 'Agenda Journey',
  map: 'Map',
  'map-settings': 'Map settings',
  worldbook: 'WorldBook',
  camera: 'Camera',
  mail: 'Mail',
  browser: 'Browser',
  healthcare: 'Ondam Care',
  housing: 'Jari',
  workplace: 'Work Hub',
  fandom: 'Aster',
  tickets: 'GATE',
  travel: 'ROAM',
  intercity: 'VIA',
  'creator-rights': 'CREDO',
  parcel: 'POSTA',
  career: 'NEXT',
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

export const normalizeAgendaJourneyIdQuery = (value) => {
  const raw = Array.isArray(value) ? value[0] : value
  if (typeof raw !== 'string') return ''
  const id = raw.trim()
  if (!id || id.length > 170 || !/^[a-z0-9][a-z0-9:._-]*$/i.test(id)) return ''
  return id
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

const buildMapReturnTarget = (route) => {
  const homePage = normalizeHomePageQuery(route?.query?.homePage)
  if (!homePage) return SOURCE_RETURN_TARGETS.map
  return {
    path: SOURCE_RETURN_TARGETS.map,
    query: { from: 'home', homePage },
  }
}

const buildAgendaJourneyReturnTarget = (route) => {
  const journeyId = normalizeAgendaJourneyIdQuery(route?.query?.journeyId)
  const homePage = normalizeHomePageQuery(route?.query?.homePage)
  const query = {
    ...(journeyId ? { journeyId } : {}),
    ...(homePage ? { from: 'home', homePage } : {}),
  }
  return {
    path: SOURCE_RETURN_TARGETS['agenda-journey'],
    ...(Object.keys(query).length ? { query } : {}),
  }
}

const normalizeBrowserContextQuery = (value, maxLength = 180) => {
  const raw = Array.isArray(value) ? value[0] : value
  if (typeof raw !== 'string') return ''
  return Array.from(raw.trim())
    .filter((character) => {
      const codePoint = character.codePointAt(0)
      return codePoint > 31 && codePoint !== 127
    })
    .join('')
    .slice(0, maxLength)
}

const buildBrowserReturnTarget = (route) => {
  const q = normalizeBrowserContextQuery(route?.query?.browserQuery)
  const result = normalizeBrowserContextQuery(route?.query?.browserResult, 140)
  const scope = normalizeBrowserContextQuery(route?.query?.browserScope, 40)
  const homePage = normalizeHomePageQuery(route?.query?.homePage)
  const query = {
    ...(q ? { q } : {}),
    ...(result ? { result } : {}),
    ...(scope ? { scope } : {}),
    ...(homePage ? { from: 'home', homePage } : {}),
  }
  return {
    path: SOURCE_RETURN_TARGETS.browser,
    ...(Object.keys(query).length ? { query } : {}),
  }
}

const buildInstalledAppReturnTarget = (route, appSource) => {
  const homePage = normalizeHomePageQuery(route?.query?.homePage)
  return {
    path: SOURCE_RETURN_TARGETS[appSource],
    ...(homePage ? { query: { from: 'home', homePage } } : {}),
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
  if (routeSource === 'agenda-journey') return buildAgendaJourneyReturnTarget(route)
  if (routeSource === 'map') return buildMapReturnTarget(route)
  if (routeSource === 'browser') return buildBrowserReturnTarget(route)
  if (routeSource === 'healthcare' || routeSource === 'housing' || routeSource === 'workplace' || routeSource === 'fandom' || routeSource === 'tickets' || routeSource === 'travel' || routeSource === 'intercity' || routeSource === 'creator-rights' || routeSource === 'parcel' || routeSource === 'career') {
    return buildInstalledAppReturnTarget(route, routeSource)
  }
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
