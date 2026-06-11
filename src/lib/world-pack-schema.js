import { normalizeWorldPackCompatibility } from './world-pack-compatibility'
import { normalizeCurrencyDefinition } from './currency-system'

export const DEFAULT_WORLD_PACK_ID = 'default_world'

export const WORLD_PACK_ACTIVATION_STATES = Object.freeze([
  'active',
  'available',
  'needs_review',
  'blocked',
])

export const WORLD_APP_ARCHETYPES = Object.freeze([
  'publication_feed',
  'marketplace',
  'reservation',
  'transit',
  'subscription',
  'dispatch',
])

const WORLD_PACK_ACTIVATION_STATE_SET = new Set(WORLD_PACK_ACTIVATION_STATES)
const WORLD_APP_ARCHETYPE_SET = new Set(WORLD_APP_ARCHETYPES)
const WORLD_PACK_SUPPORT_STATE_SET = new Set(['supported', 'unsupported'])

const toInt = (value, fallback = 0) => {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return fallback
  return Math.max(0, Math.floor(numeric))
}

const normalizeText = (value, fallback = '', maxLength = 1000) => {
  if (typeof value !== 'string') return fallback
  const normalized = value.trim()
  if (!normalized) return fallback
  return normalized.slice(0, maxLength)
}

const normalizeInlineText = (value, fallback = '', maxLength = 180) =>
  normalizeText(value, fallback, maxLength).replace(/\s+/g, ' ')

const normalizeId = (value, fallback = '') => {
  const normalized = normalizeInlineText(value, '', 120)
    .toLowerCase()
    .replace(/[^a-z0-9_:-]+/g, '_')
    .replace(/^_+|_+$/g, '')
  return normalized || fallback
}

const normalizeStringList = (value, maxLength = 120) => {
  if (!Array.isArray(value)) return []
  const seen = new Set()
  const items = []
  value.forEach((item) => {
    const normalized = normalizeId(item, '')
    if (!normalized || seen.has(normalized)) return
    seen.add(normalized)
    items.push(normalized.slice(0, maxLength))
  })
  return items
}

const normalizeRelationshipRegistryEntries = (value, type = 'category') => {
  if (!Array.isArray(value)) return []
  const seen = new Set()
  return value
    .map((item, index) => {
      const source = item && typeof item === 'object' ? item : { id: item }
      const id = normalizeId(source.id, `world_${type}_${index + 1}`)
      if (!id || seen.has(id)) return null
      seen.add(id)
      return {
        id,
        label: normalizeInlineText(source.label || source.name, id, 100),
        description: normalizeInlineText(source.description, '', 300),
        fallbackCategoryId: normalizeId(source.fallbackCategoryId || source.fallbackId, ''),
      }
    })
    .filter(Boolean)
    .slice(0, 20)
}

const normalizeActivationState = (value) => {
  const normalized = normalizeInlineText(value, '').toLowerCase()
  return WORLD_PACK_ACTIVATION_STATE_SET.has(normalized) ? normalized : 'available'
}

const normalizeSupportState = (value) => {
  const normalized = normalizeInlineText(value, 'supported', 80).toLowerCase()
  return WORLD_PACK_SUPPORT_STATE_SET.has(normalized) ? normalized : 'supported'
}

const normalizeArchetype = (value) => {
  const normalized = normalizeInlineText(value, '').toLowerCase()
  return WORLD_APP_ARCHETYPE_SET.has(normalized) ? normalized : 'publication_feed'
}

const normalizeTermMap = (value) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return Object.fromEntries(
    Object.entries(value)
      .map(([key, rawValue]) => [
        normalizeInlineText(key, '', 80),
        normalizeInlineText(rawValue, '', 120),
      ])
      .filter(([key, term]) => key && term)
      .slice(0, 40),
  )
}

const normalizeWorldPackEconomy = (value = {}, options = {}) => {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {}
  const rawCurrencies = Array.isArray(source.currencies)
    ? source.currencies
    : Array.isArray(source.injectedCurrencies)
      ? source.injectedCurrencies
      : []
  const seen = new Set()
  const currencies = rawCurrencies
    .map((currency) => {
      const normalized = normalizeCurrencyDefinition(currency, {
        source: 'world_pack',
        worldPackId: options.worldPackId || '',
      })
      if (!normalized) return null
      return {
        ...normalized,
        rateToCny:
          Number.isFinite(Number(currency?.rateToCny)) && Number(currency.rateToCny) > 0
            ? Number(currency.rateToCny)
            : 0,
      }
    })
    .filter((currency) => {
      if (!currency || seen.has(currency.code)) return false
      seen.add(currency.code)
      return true
    })
    .slice(0, 12)

  return {
    currencies,
  }
}

const normalizeWorldAppUiThemePackage = (value) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { enabled: false, themeId: '', styleScope: 'none' }
  }
  return {
    enabled: value.enabled === true,
    themeId: normalizeId(value.themeId || value.id, ''),
    styleScope: normalizeId(value.styleScope || value.scope, 'app'),
  }
}

export const normalizeWorldAppBinding = (raw, index = 0) => {
  const source = raw && typeof raw === 'object' ? raw : {}
  const archetype = normalizeArchetype(source.archetype || source.type)
  const title = normalizeInlineText(source.title || source.name, `World app ${index + 1}`, 120)

  return {
    id: normalizeId(source.id, `world_app_${archetype}_${index + 1}`),
    archetype,
    title,
    description: normalizeInlineText(source.description, '', 300),
    moduleKey: normalizeId(source.moduleKey || source.module, ''),
    route: normalizeInlineText(source.route, '', 160),
    enabled: source.enabled !== false,
    terminology: normalizeTermMap(source.terminology),
    uiThemePackage: normalizeWorldAppUiThemePackage(source.uiThemePackage),
  }
}

export const normalizeWorldServiceAccountTemplate = (raw, index = 0) => {
  const source = raw && typeof raw === 'object' ? raw : {}
  const title = normalizeInlineText(source.title || source.name, `Service template ${index + 1}`, 120)
  const userEditedAt = toInt(source.userEditedAt, 0)
  const confirmedAt = toInt(source.confirmedAt, 0)

  return {
    id: normalizeId(source.id, `service_template_${index + 1}`),
    title,
    name: normalizeInlineText(source.name, title, 120),
    category: normalizeId(source.category, 'publication'),
    description: normalizeInlineText(source.description, '', 300),
    tone: normalizeInlineText(source.tone, 'clear', 80),
    linkedAppBindingId: normalizeId(source.linkedAppBindingId || source.appBindingId, ''),
    pushPolicy: normalizeInlineText(source.pushPolicy, 'reviewed', 80),
    enabled: source.enabled !== false,
    userEditedAt,
    source: normalizeId(source.source, ''),
    proposalConfidence: normalizeId(source.proposalConfidence, ''),
    proposalEvidence: normalizeInlineText(source.proposalEvidence, '', 500),
    confirmedAt,
  }
}

export const BUILT_IN_WORLD_PACKS = Object.freeze([
  {
    id: DEFAULT_WORLD_PACK_ID,
    title: '默认世界',
    name: 'Default world',
    description: 'Use the current WorldBook material without adding extra world-specific defaults.',
    source: 'system',
    state: 'active',
    appBindings: [],
    serviceAccountTemplates: [],
  },
  {
    id: 'modern_parallel',
    title: '现代平行世界',
    name: 'Modern parallel',
    description: 'A realistic contemporary world with media feeds, delivery services, and familiar social systems.',
    source: 'built_in',
    state: 'available',
    supportState: 'supported',
    compatibility: {
      recommended: {
        era: ['modern'],
        realism: ['realistic'],
        technologyLevel: ['real_world'],
      },
      adaptable: {
        settingTraits: ['school', 'entertainment', 'urban', 'business_family'],
      },
    },
    terminology: {
      publication: '频道',
      serviceAccount: '服务号',
    },
    appBindings: [
      {
        id: 'modern_news_feed',
        archetype: 'publication_feed',
        title: '城市频道',
        moduleKey: 'chat',
        route: '/chat-contacts',
        description: 'World-specific subscription and announcement feeds.',
      },
    ],
    serviceAccountTemplates: [
      {
        id: 'modern_city_bulletin',
        title: '城市公告频道',
        category: 'publication',
        description: 'Publishes city notices, rumors, and daily context without owning source-module records.',
        linkedAppBindingId: 'modern_news_feed',
      },
    ],
  },
  {
    id: 'school_life',
    title: '校园生活拓展',
    name: 'School life expansion',
    description: 'Adds campus schedules, class notices, and school-service context to a modern or near-future main worldview.',
    source: 'built_in',
    state: 'available',
    supportState: 'supported',
    compatibility: {
      recommended: {
        era: ['modern'],
        settingTraits: ['school'],
        socialRoles: ['student'],
        technologyLevel: ['real_world'],
      },
      adaptable: {
        settingTraits: ['urban', 'entertainment'],
      },
      conflicts: {
        economyTraits: ['resource_scarce'],
      },
    },
    terminology: {
      reservation: '课表',
      publication: '校内公告',
    },
    appBindings: [
      {
        id: 'school_schedule_board',
        archetype: 'reservation',
        title: '课表看板',
        moduleKey: 'calendar',
        route: '/calendar',
        description: 'Connects campus schedules to Calendar while Calendar keeps confirmed events.',
      },
      {
        id: 'school_bulletin_feed',
        archetype: 'publication_feed',
        title: '校内公告',
        moduleKey: 'chat',
        route: '/chat-contacts',
        description: 'A school bulletin entry for reviewed service candidates and notices.',
      },
    ],
    serviceAccountTemplates: [
      {
        id: 'school_affairs_office',
        title: '学生事务处',
        category: 'publication',
        description: 'Publishes campus notices after the user joins it in Chat Services.',
        linkedAppBindingId: 'school_bulletin_feed',
      },
    ],
  },
  {
    id: 'business_family',
    title: '商业财阀拓展',
    name: 'Business family expansion',
    description: 'Adds family-office, board-calendar, and resource hierarchy context to modern or future social worlds.',
    source: 'built_in',
    state: 'available',
    supportState: 'supported',
    compatibility: {
      recommended: {
        era: ['modern', 'future'],
        settingTraits: ['business_family', 'corporate', 'urban'],
        economyTraits: ['luxury', 'corporate_controlled'],
      },
      adaptable: {
        settingTraits: ['school', 'entertainment'],
      },
    },
    terminology: {
      reservation: '会议日程',
      publication: '家族办公室',
    },
    appBindings: [
      {
        id: 'business_board_calendar',
        archetype: 'reservation',
        title: '董事日程',
        moduleKey: 'calendar',
        route: '/calendar',
        description: 'Adds board and family-office schedule framing while Calendar keeps event truth.',
      },
      {
        id: 'business_office_feed',
        archetype: 'publication_feed',
        title: '家族办公室',
        moduleKey: 'chat',
        route: '/chat-contacts',
        description: 'A family-office style feed for service-account candidates.',
      },
    ],
    serviceAccountTemplates: [
      {
        id: 'family_office_channel',
        title: '家族办公室',
        category: 'publication',
        description: 'Publishes office notices and resource reminders after the user joins it in Chat Services.',
        linkedAppBindingId: 'business_office_feed',
      },
    ],
  },
  {
    id: 'urban_mystery',
    title: '都市怪谈拓展',
    name: 'Urban mystery expansion',
    description: 'Adds supernatural rumor and investigation context to an urban main worldview after user confirmation.',
    source: 'built_in',
    state: 'available',
    supportState: 'supported',
    compatibility: {
      recommended: {
        era: ['modern'],
        settingTraits: ['urban', 'investigation'],
      },
      requiresConfirmation: {
        realism: ['supernatural'],
      },
      adaptable: {
        settingTraits: ['school', 'business_family', 'entertainment'],
      },
    },
    terminology: {
      publication: '怪谈线索',
      transit: '异常地点',
    },
    appBindings: [
      {
        id: 'urban_rumor_feed',
        archetype: 'publication_feed',
        title: '怪谈线索',
        moduleKey: 'chat',
        route: '/chat-contacts',
        description: 'A rumor-feed style entry for reviewed service candidates.',
      },
      {
        id: 'urban_incident_map',
        archetype: 'transit',
        title: '异常地点',
        moduleKey: 'map',
        route: '/map',
        description: 'Adds incident-location framing while Map keeps route and trip truth.',
      },
    ],
    serviceAccountTemplates: [
      {
        id: 'urban_rumor_channel',
        title: '匿名怪谈投稿箱',
        category: 'publication',
        description: 'Publishes reviewed rumor prompts after the user joins it in Chat Services.',
        linkedAppBindingId: 'urban_rumor_feed',
      },
    ],
  },
  {
    id: 'survival_city',
    title: '灾后生存都市',
    name: 'Post-disaster survival city',
    description: 'A resource-constrained city where supply, dispatch, territory, and alerts matter.',
    source: 'built_in',
    state: 'available',
    supportState: 'supported',
    compatibility: {
      recommended: {
        era: ['modern', 'future', 'post_apocalyptic'],
        settingTraits: ['survival'],
        economyTraits: ['resource_scarce'],
      },
      conflicts: {
        economyTraits: ['ordinary', 'luxury'],
      },
    },
    terminology: {
      marketplace: '补给站',
      dispatch: '救援调度',
    },
    appBindings: [
      {
        id: 'survival_supply_board',
        archetype: 'marketplace',
        title: '补给站',
        moduleKey: 'shopping',
        route: '/shopping',
        description: 'Maps marketplace behavior to survival supplies while Shopping keeps order truth.',
      },
      {
        id: 'survival_dispatch',
        archetype: 'dispatch',
        title: '救援调度',
        moduleKey: 'food_delivery',
        route: '/food-delivery',
        description: 'Maps delivery and dispatch alerts to survival support.',
      },
      {
        id: 'survival_safe_route_pass',
        archetype: 'transit',
        title: 'Safe Route Pass',
        moduleKey: 'map',
        route: '/map',
        description: 'Maps travel access to survival safe-route context while Map keeps route and trip truth.',
      },
    ],
    serviceAccountTemplates: [
      {
        id: 'survival_supply_dispatch',
        title: '补给调度员',
        category: 'service_notification',
        description: 'Sends reviewed supply and delivery updates from source modules.',
        linkedAppBindingId: 'survival_supply_board',
      },
    ],
  },
  {
    id: 'fandom_parallel',
    title: '偶像企划平行世界',
    name: 'Fandom parallel',
    description: 'A fandom-centered world with publication feeds, schedules, events, and subscription notices.',
    source: 'built_in',
    state: 'available',
    supportState: 'supported',
    compatibility: {
      recommended: {
        era: ['modern'],
        settingTraits: ['entertainment'],
        socialRoles: ['celebrity', 'fan', 'manager'],
      },
      adaptable: {
        settingTraits: ['school', 'business_family', 'urban'],
      },
    },
    terminology: {
      publication: '粉丝站',
      subscription: '会员频道',
    },
    appBindings: [
      {
        id: 'fandom_publication_feed',
        archetype: 'publication_feed',
        title: '粉丝站',
        moduleKey: 'chat',
        route: '/chat-contacts',
        description: 'A publication feed for fan-club news and official-style posts.',
      },
      {
        id: 'fandom_schedule_board',
        archetype: 'reservation',
        title: '行程看板',
        moduleKey: 'calendar',
        route: '/calendar',
        description: 'Connects pack terminology to Calendar-owned schedules.',
      },
    ],
    serviceAccountTemplates: [
      {
        id: 'fandom_official_feed',
        title: '官方粉丝站',
        category: 'publication',
        description: 'Sends reviewed fandom updates and routes actions back to source modules.',
        linkedAppBindingId: 'fandom_publication_feed',
      },
    ],
  },
])

export const normalizeWorldPack = (raw, index = 0) => {
  const source = raw && typeof raw === 'object' ? raw : {}
  const now = Date.now()
  const id = normalizeId(source.id, `world_pack_${index + 1}`)
  const createdAt = toInt(source.createdAt, now)
  const appBindings = Array.isArray(source.appBindings)
    ? source.appBindings.map((binding, bindingIndex) => normalizeWorldAppBinding(binding, bindingIndex))
    : []
  const serviceAccountTemplates = Array.isArray(source.serviceAccountTemplates)
    ? source.serviceAccountTemplates.map((template, templateIndex) =>
        normalizeWorldServiceAccountTemplate(template, templateIndex),
      )
    : []

  return {
    id,
    title: normalizeInlineText(source.title, id === DEFAULT_WORLD_PACK_ID ? '默认世界' : `世界包 ${index + 1}`, 120),
    name: normalizeInlineText(source.name, id === DEFAULT_WORLD_PACK_ID ? 'Default world' : `World pack ${index + 1}`, 120),
    description: normalizeInlineText(source.description, '', 500),
    source: normalizeId(source.source, 'user'),
    state: normalizeActivationState(source.state),
    supportState: normalizeSupportState(source.supportState),
    unsupportedReason: normalizeId(source.unsupportedReason, ''),
    version: Math.max(1, toInt(source.version, 1)),
    encyclopediaEntryIds: normalizeStringList(source.encyclopediaEntryIds || source.knowledgePointIds),
    knowledgePointIds: normalizeStringList(source.encyclopediaEntryIds || source.knowledgePointIds),
    profileTemplateIds: normalizeStringList(source.profileTemplateIds),
    bookSourceLinkIds: normalizeStringList(source.bookSourceLinkIds),
    compatibility: normalizeWorldPackCompatibility(source.compatibility),
    relationshipCategories: normalizeRelationshipRegistryEntries(source.relationshipCategories, 'category'),
    relationshipModifiers: normalizeRelationshipRegistryEntries(source.relationshipModifiers, 'modifier'),
    appBindings,
    serviceAccountTemplates,
    terminology: normalizeTermMap(source.terminology),
    economy: normalizeWorldPackEconomy(source.economy || source.economySettings, { worldPackId: id }),
    createdAt,
    updatedAt: toInt(source.updatedAt, createdAt),
  }
}

export const normalizeWorldPacks = (rawPacks = []) => {
  const merged = [
    ...BUILT_IN_WORLD_PACKS,
    ...(Array.isArray(rawPacks) ? rawPacks : []),
  ]
  const byId = new Map()
  merged.forEach((pack, index) => {
    const normalized = normalizeWorldPack(pack, index)
    byId.set(normalized.id, {
      ...(byId.get(normalized.id) || {}),
      ...normalized,
    })
  })
  return [...byId.values()].sort((a, b) => {
    if (a.id === DEFAULT_WORLD_PACK_ID) return -1
    if (b.id === DEFAULT_WORLD_PACK_ID) return 1
    return a.title.localeCompare(b.title)
  })
}

export const normalizeWorldPackActivation = (raw = {}, activePackId = DEFAULT_WORLD_PACK_ID) => {
  const source = raw && typeof raw === 'object' ? raw : {}
  return {
    activePackId: normalizeId(source.activePackId, activePackId || DEFAULT_WORLD_PACK_ID),
    state: normalizeActivationState(source.state || 'active'),
    reviewedAt: toInt(source.reviewedAt, 0),
    activatedAt: toInt(source.activatedAt, 0),
    reviewSnapshot:
      source.reviewSnapshot && typeof source.reviewSnapshot === 'object'
        ? { ...source.reviewSnapshot }
        : {},
  }
}

const buildReferenceMap = (items = []) =>
  new Map(
    (Array.isArray(items) ? items : [])
      .filter((item) => item && typeof item === 'object' && normalizeId(item.id, ''))
      .map((item) => [normalizeId(item.id, ''), item]),
  )

export const buildWorldPackActivationReview = ({
  pack,
  encyclopediaEntries = [],
  knowledgePoints = [],
  profileTemplates = [],
  bookSourceLinks = [],
} = {}) => {
  const normalizedPack = normalizeWorldPack(pack || BUILT_IN_WORLD_PACKS[0])
  const encyclopediaMap = buildReferenceMap(
    Array.isArray(encyclopediaEntries) && encyclopediaEntries.length > 0
      ? encyclopediaEntries
      : knowledgePoints,
  )
  const templateMap = buildReferenceMap(profileTemplates)
  const sourceLinkMap = buildReferenceMap(bookSourceLinks)
  const blockers = []

  normalizedPack.encyclopediaEntryIds.forEach((id) => {
    if (!encyclopediaMap.has(id)) blockers.push({ type: 'missing_encyclopedia_entry', id })
  })
  normalizedPack.profileTemplateIds.forEach((id) => {
    if (!templateMap.has(id)) blockers.push({ type: 'missing_profile_template', id })
  })
  normalizedPack.bookSourceLinkIds.forEach((id) => {
    if (!sourceLinkMap.has(id)) blockers.push({ type: 'missing_book_source', id })
  })

  const effectRows = [
    {
      key: 'book_sources',
      label: 'Book sources',
      count: normalizedPack.bookSourceLinkIds.length || (Array.isArray(bookSourceLinks) ? bookSourceLinks.length : 0),
    },
    {
      key: 'encyclopedia',
      label: 'Encyclopedia',
      count: normalizedPack.encyclopediaEntryIds.length,
    },
    {
      key: 'templates',
      label: 'Role templates',
      count: normalizedPack.profileTemplateIds.length,
    },
    {
      key: 'app_bindings',
      label: 'App bindings',
      count: normalizedPack.appBindings.filter((binding) => binding.enabled !== false).length,
    },
    {
      key: 'service_templates',
      label: 'Service templates',
      count: normalizedPack.serviceAccountTemplates.filter((template) => template.enabled !== false).length,
    },
  ]

  return {
    packId: normalizedPack.id,
    packTitle: normalizedPack.title,
    packName: normalizedPack.name,
    blocked: blockers.length > 0,
    blockers,
    effectRows,
    appBindings: normalizedPack.appBindings,
    serviceAccountTemplates: normalizedPack.serviceAccountTemplates,
    terminology: normalizedPack.terminology,
    summary: {
      bookSourceCount: effectRows.find((row) => row.key === 'book_sources')?.count || 0,
      encyclopediaEntryCount: normalizedPack.encyclopediaEntryIds.length,
      knowledgeCount: normalizedPack.encyclopediaEntryIds.length,
      profileTemplateCount: normalizedPack.profileTemplateIds.length,
      appBindingCount: normalizedPack.appBindings.length,
      serviceTemplateCount: normalizedPack.serviceAccountTemplates.length,
    },
  }
}
