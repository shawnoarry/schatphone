import { defineStore } from 'pinia'
import { computed, reactive, ref, watch } from 'vue'
import { readPersistedState, readPersistedStateAsync, writePersistedState } from '../lib/persistence'
import { DEFAULT_SYSTEM_LANGUAGE, normalizeSystemLanguage } from '../lib/locale'
import {
  createInitialSoftwareUpdateState,
  hasSoftwareUpdateCandidate,
  normalizeSoftwareUpdateState,
} from '../lib/app-update'
import {
  normalizePushDisplayMode,
  normalizePushPermission,
  normalizePushServerUrl,
  readPushPermission,
  relayNotificationToPush,
  syncExistingWebPushSubscription,
} from '../lib/push'
import { normalizeAppIconOverrides } from '../lib/app-icon-presentation'
import {
  normalizeEntryOverrideId,
  normalizeEntryPresentationOverrides,
} from '../lib/app-entry-presentation'
import {
  normalizeAppStoreMiniAppPlacements,
  setMiniAppEntryInstalled,
} from '../lib/app-store-mini-app-placement'
import {
  APP_STORE_HOME_APP_ID,
  ASSETS_HOME_APP_ID,
  BOOK_HOME_APP_ID,
  CONTROL_CENTER_HOME_APP_ID,
  FOOD_DELIVERY_HOME_APP_ID,
  REMINDERS_HOME_APP_ID,
  SHOPPING_HOME_APP_ID,
} from '../lib/planned-module-registry'
import { VALID_WIDGET_SIZES, validateWidgetImportPayload } from '../lib/widget-schema'
import { normalizeImageSource } from '../lib/image-source-contract'
import { detectApiKindFromUrl } from '../lib/ai'
import {
  assignHomeLayoutSlots,
  canHomeLayoutTileSizeUseSlot,
  createDefaultHomeLayoutTemplateIds,
  getHomeLayoutTemplate,
  normalizeHomeLayoutSlotPlacements,
  normalizeHomeLayoutTemplateId,
  normalizeHomeLayoutTemplateIds,
} from '../lib/home-layout-templates'
import {
  DEFAULT_CUSTOM_WIDGET_ACTION,
  normalizeCustomWidgetAction,
} from '../lib/custom-widget-actions'
import {
  normalizeWorldBookSourceLink,
  normalizeWorldBookSourceLinks,
} from '../lib/book-text-schema'
import {
  BUILT_IN_WORLD_PACKS,
  DEFAULT_WORLD_PACK_ID,
  buildWorldPackActivationReview as buildWorldPackActivationReviewPayload,
  normalizeWorldPack,
  normalizeWorldPackActivation,
  normalizeWorldPacks,
  normalizeWorldServiceAccountTemplate,
} from '../lib/world-pack-schema'
import {
  buildWorldPackCompatibilityReview,
  groupWorldPackRecommendations,
  normalizeWorldProfile,
} from '../lib/world-pack-compatibility'
import {
  buildWorldAppEntryRows,
  isWorldAppHomeTileId,
} from '../lib/world-pack-app-bindings'
import {
  PROFILE_TEMPLATE_SCOPES,
  cloneProfileTemplate,
  createDefaultProfileTemplatePresets,
  normalizeProfileTemplate,
  normalizeProfileTemplates,
} from '../lib/profile-template-schema'
import { normalizeChatAppearance } from '../lib/chat-appearance'
import { normalizeScopedCustomCss } from '../lib/appearance-scoped-css'
import {
  normalizeAppSkinSettings,
  resolveAppSkinTargetForScope,
} from '../lib/app-skin-customization'
import {
  buildAppearancePack,
  mergeAppearancePackIntoAppearance,
} from '../lib/appearance-pack'
import {
  buildWorldAppBindingFromTemplateProposal,
  buildWorldAppTemplateExtractionReview as buildWorldAppTemplateExtractionReviewPayload,
  listWorldAppTemplateRegistry,
} from '../lib/world-app-template-registry'
import {
  buildWorldServiceAccountTemplateFromProposal,
  buildWorldServiceTemplateProposalReview as buildWorldServiceTemplateProposalReviewPayload,
} from '../lib/world-service-template-proposals'

const AVAILABLE_THEMES = [
  {
    id: 'default',
    name: 'Default System',
    preview: 'linear-gradient(180deg, #f7f8fa 0%, #e2e8ed 52%, #aab8c3 100%)',
    darkText: true,
    wallpaper: '',
  },
  {
    id: 'zen',
    name: 'Graphite Quiet',
    preview: 'linear-gradient(180deg, #25303a 0%, #151c24 54%, #0d1218 100%)',
    darkText: false,
    wallpaper: '',
  },
]

const DEFAULT_WIDGET_PAGES = [
  ['weather', 'calendar', 'music', 'app_network', 'app_wallet', 'app_themes', 'app_gallery'],
  [
    'app_phone',
    'app_map',
    'app_calendar',
    REMINDERS_HOME_APP_ID,
    'app_stock',
    SHOPPING_HOME_APP_ID,
    FOOD_DELIVERY_HOME_APP_ID,
    ASSETS_HOME_APP_ID,
  ],
  [
    'system',
    'quick_heart',
    'quick_disc',
    APP_STORE_HOME_APP_ID,
  ],
  [],
  [],
]

const LEGACY_DEFAULT_WIDGET_PAGES = [
  ['weather', 'calendar', 'music', 'app_network', 'app_chat', 'app_wallet', 'app_themes', 'app_gallery'],
  [
    'system',
    'quick_heart',
    'quick_disc',
    'app_phone',
    'app_map',
    'app_calendar',
    REMINDERS_HOME_APP_ID,
    'app_stock',
    SHOPPING_HOME_APP_ID,
    FOOD_DELIVERY_HOME_APP_ID,
    ASSETS_HOME_APP_ID,
    'app_more',
  ],
  [],
  [],
  [],
]

const HOME_TILE_ALIASES = {
  app_mail: 'app_network',
  app_maps: 'app_map',
  app_reminder: REMINDERS_HOME_APP_ID,
  app_todo: REMINDERS_HOME_APP_ID,
  app_tasks: REMINDERS_HOME_APP_ID,
  app_profile: 'app_chat',
  app_worldbook: 'app_files',
  app_more: APP_STORE_HOME_APP_ID,
}

const CORE_HOME_TILE_IDS = [
  'weather',
  'calendar',
  'music',
  'system',
  'quick_heart',
  'quick_disc',
  'app_network',
  'app_wallet',
  'app_themes',
  'app_widgets',
  'app_phone',
  'app_map',
  'app_calendar',
  REMINDERS_HOME_APP_ID,
  'app_stock',
  'app_chat',
  'app_contacts',
  'app_settings',
  'app_gallery',
  SHOPPING_HOME_APP_ID,
  FOOD_DELIVERY_HOME_APP_ID,
  ASSETS_HOME_APP_ID,
  CONTROL_CENTER_HOME_APP_ID,
  BOOK_HOME_APP_ID,
  APP_STORE_HOME_APP_ID,
]
const HIDDEN_FRONTEND_HOME_TILE_IDS = new Set(['app_files'])
const OPTIONAL_HOME_TILE_IDS = new Set()
const BUILT_IN_WIDGET_TILE_IDS = CORE_HOME_TILE_IDS.filter(
  (tileId) => typeof tileId === 'string' && !tileId.startsWith('app_'),
)

const MIN_HOME_PAGES = 5
const DEFAULT_HOME_TILE_ORDER_PAGES = DEFAULT_WIDGET_PAGES.map((page) => [...page])
const DEFAULT_APP_STORE_HOME_PAGE_INDEX = DEFAULT_HOME_TILE_ORDER_PAGES.findIndex((page) =>
  page.includes(APP_STORE_HOME_APP_ID),
)
if (DEFAULT_APP_STORE_HOME_PAGE_INDEX >= 0) {
  const page = DEFAULT_HOME_TILE_ORDER_PAGES[DEFAULT_APP_STORE_HOME_PAGE_INDEX]
  const appStoreIndex = page.indexOf(APP_STORE_HOME_APP_ID)
  if (appStoreIndex < 0) {
    page.push(CONTROL_CENTER_HOME_APP_ID)
  } else {
    page.splice(appStoreIndex, 0, CONTROL_CENTER_HOME_APP_ID)
  }
} else {
  DEFAULT_HOME_TILE_ORDER_PAGES[1] = [
    ...(DEFAULT_HOME_TILE_ORDER_PAGES[1] || []),
    CONTROL_CENTER_HOME_APP_ID,
  ]
}

const DEFAULT_TILE_PAGE_INDEX = Object.fromEntries(
  DEFAULT_HOME_TILE_ORDER_PAGES.flatMap((page, pageIndex) =>
    page.map((tileId) => [tileId, pageIndex]),
  ),
)

const CUSTOM_WIDGET_ID_PREFIX = 'custom_widget_'
const CUSTOM_WIDGET_SIZES = [...VALID_WIDGET_SIZES]
const VALID_LOCK_CLOCK_STYLES = ['classic', 'outline', 'mono']
const DEFAULT_LOCK_CLOCK_STYLE = 'classic'
const VALID_WALLPAPER_MODES = ['theme', 'url', 'gallery']
const DEFAULT_WALLPAPER_MODE = 'theme'
const LEGACY_THEME_MIGRATIONS = Object.freeze({
  y2k: 'default',
})
const LEGACY_THEME_WALLPAPERS = new Set([
  'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1000&q=80',
])
const MAX_NOTIFICATIONS = 80
const MAX_API_REPORTS = 200
const MAX_AI_AUTOMATION_QUEUE_SIZE = 240
const MAX_AI_AUTOMATION_RECENT_FINGERPRINTS = 400
const MAX_CHAT_TRUTH_EVENTS = 400
const BACKUP_REMINDER_MIN_INTERVAL_HOURS = 1
const BACKUP_REMINDER_MAX_INTERVAL_HOURS = 24 * 30
const BACKUP_REMINDER_DEFAULT_INTERVAL_HOURS = 24
const BACKUP_COPY_TONE_VALUES = ['direct', 'immersive']
const DEFAULT_BACKUP_COPY_TONE = 'direct'
const MORE_FEATURE_TOGGLE_IDS = ['smart_panel', 'focus_mode', 'scene_switch', 'control_center']
const DEFAULT_MORE_FEATURE_TOGGLES = Object.freeze({
  smart_panel: true,
  focus_mode: false,
  scene_switch: false,
  control_center: false,
})
const USER_AI_CONTEXT_RECOMMENDED_KEYS = ['name', 'occupation', 'relationship', 'bio']
const USER_AI_CONTEXT_FIELD_LIMITS = Object.freeze({
  name: 80,
  gender: 40,
  birthday: 40,
  occupation: 120,
  relationship: 160,
  bio: 600,
})
const DEFAULT_PUSH_SERVER_URL = normalizePushServerUrl(
  typeof import.meta !== 'undefined' ? import.meta?.env?.VITE_PUSH_SERVER_URL : '',
  'http://localhost:8787',
)
const DEFAULT_API_URL =
  typeof import.meta !== 'undefined' && typeof import.meta?.env?.VITE_API_URL === 'string'
    ? import.meta.env.VITE_API_URL.trim() || 'https://api.openai.com/v1/chat/completions'
    : 'https://api.openai.com/v1/chat/completions'
const DEFAULT_API_KEY =
  typeof import.meta !== 'undefined' && typeof import.meta?.env?.VITE_API_KEY === 'string'
    ? import.meta.env.VITE_API_KEY.trim()
    : ''
const DEFAULT_API_MODEL =
  typeof import.meta !== 'undefined' && typeof import.meta?.env?.VITE_API_MODEL === 'string'
    ? import.meta.env.VITE_API_MODEL.trim() || 'gpt-4o-mini'
    : 'gpt-4o-mini'
const DEFAULT_API_RESOLVED_KIND = detectApiKindFromUrl(DEFAULT_API_URL)
const MAX_GLOBAL_WORLDVIEW_CHARS = 6000
const MAX_KNOWLEDGE_POINTS = 200
const MAX_KNOWLEDGE_POINT_ID_CHARS = 64
const MAX_KNOWLEDGE_POINT_TITLE_CHARS = 80
const MAX_KNOWLEDGE_POINT_CONTENT_CHARS = 1600
const MAX_KNOWLEDGE_POINT_TAGS = 12
const MAX_KNOWLEDGE_POINT_TAG_CHARS = 24
const KNOWLEDGE_POINT_MATCH_STOP_WORDS = new Set([
  'a',
  'an',
  'and',
  'are',
  'for',
  'from',
  'has',
  'have',
  'into',
  'not',
  'that',
  'the',
  'their',
  'this',
  'was',
  'were',
  'will',
  'with',
  'your',
])
const DEFAULT_GLOBAL_WORLDVIEW =
  '这是一个赛博朋克风格的近未来世界。科技高度发达，但生活水平差距巨大。大型公司控制着资源与秩序。'
const DEFAULT_CHAT_TRUTH_METRICS = Object.freeze({
  affinity: 50,
  trust: 50,
  distance: 50,
  dependency: 20,
  tension: 10,
  relationshipStage: 'neutral',
  lastWarmMomentAt: 0,
  lastConflictAt: 0,
  lastInteractionAt: 0,
  lastUserMessageAt: 0,
  lastAssistantMessageAt: 0,
  userMessageCount: 0,
  assistantMessageCount: 0,
  manualTriggerCount: 0,
  autoTriggerCount: 0,
  rerollCount: 0,
  notifyOnlySkipCount: 0,
  resumeSettlementCount: 0,
})

const SYSTEM_STORAGE_KEY = 'store:system'
const SYSTEM_STORAGE_VERSION = 1
const HOME_DESKTOP_SETUP_VERSION = 2

const AI_AUTOMATION_MODULE_KEYS = ['chat', 'map', 'shopping']
const DEFAULT_AI_AUTOMATION_SETTINGS = Object.freeze({
  masterEnabled: false,
  notifyOnlyMode: false,
  quietHoursEnabled: false,
  quietHoursStart: '23:00',
  quietHoursEnd: '07:00',
  conflictCooldownSec: 20,
  dedupeWindowSec: 120,
  modules: {
    chat: { enabled: true, priority: 100 },
    map: { enabled: false, priority: 60 },
    shopping: { enabled: false, priority: 50 },
  },
})

const toInt = (value, fallback = 0) => {
  const num = Number(value)
  return Number.isFinite(num) ? Math.floor(num) : fallback
}

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

const cloneDefaultWidgetPages = () => DEFAULT_WIDGET_PAGES.map((page) => [...page])
const cloneDefaultHomeLayoutTemplateIds = () => createDefaultHomeLayoutTemplateIds(MIN_HOME_PAGES)
const cloneDefaultHomeLayoutSlotPlacements = () => {
  const pages = cloneDefaultWidgetPages()
  const templateIds = cloneDefaultHomeLayoutTemplateIds()
  return createHomeLayoutSlotPlacementsFromPages(pages, templateIds)
}

const normalizeHomeDesktopSetupVersion = (value) => {
  const normalized = Number(value)
  if (!Number.isFinite(normalized) || normalized < HOME_DESKTOP_SETUP_VERSION) return 0
  return Math.floor(normalized)
}

const insertHomeTileByDefaultOrder = (page, tileId, pageIndex = 0) => {
  const order = DEFAULT_HOME_TILE_ORDER_PAGES[pageIndex] || []
  const targetOrder = order.indexOf(tileId)
  const nextPage = Array.isArray(page) ? page.filter((itemId) => itemId !== tileId) : []

  if (targetOrder < 0) {
    nextPage.push(tileId)
    return nextPage
  }

  const insertIndex = nextPage.findIndex((itemId) => {
    const itemOrder = order.indexOf(itemId)
    return itemOrder >= 0 && itemOrder > targetOrder
  })

  if (insertIndex < 0) {
    nextPage.push(tileId)
    return nextPage
  }

  nextPage.splice(insertIndex, 0, tileId)
  return nextPage
}

const areHomeTilePagesEqual = (pages, expectedPages) => {
  if (!Array.isArray(pages) || !Array.isArray(expectedPages)) return false
  if (pages.length !== expectedPages.length) return false

  return expectedPages.every((expectedPage, pageIndex) => {
    const page = Array.isArray(pages[pageIndex]) ? pages[pageIndex] : []
    const comparablePage = page.filter((tileId) => tileId !== CONTROL_CENTER_HOME_APP_ID)
    if (comparablePage.length !== expectedPage.length) return false
    return expectedPage.every((tileId, index) => comparablePage[index] === (HOME_TILE_ALIASES[tileId] || tileId))
  })
}

const isLegacyCrowdedHomeDesktopSetup = (pages) => {
  if (!Array.isArray(pages)) return false
  const normalizedPages = normalizeHomeWidgetPages(pages, [], {
    defaultWhenEmpty: false,
  })
  const firstPage = new Set(normalizedPages[0] || [])
  const secondPage = new Set(normalizedPages[1] || [])
  const legacyFirstPageCore = [
    'weather',
    'calendar',
    'music',
    'app_network',
    'app_chat',
    'app_wallet',
    'app_themes',
    'app_gallery',
  ]
  const legacySecondPageCore = ['system', 'quick_heart', 'quick_disc', 'app_phone', 'app_map']

  return (
    legacyFirstPageCore.every((tileId) => firstPage.has(tileId)) &&
    legacySecondPageCore.every((tileId) => secondPage.has(tileId))
  )
}

const hasAnyHomeLayoutSlotPlacement = (slotPlacements) =>
  Array.isArray(slotPlacements) &&
  slotPlacements.some(
    (page) =>
      Array.isArray(page) &&
      page.some((placement) => {
        const slotId = typeof placement?.slotId === 'string' ? placement.slotId.trim() : ''
        const tileId = typeof placement?.tileId === 'string' ? placement.tileId.trim() : ''
        return !!slotId && !!tileId
      }),
  )

const buildDefaultHomeWidgetPages = (enabledOptionalTileIds = []) => {
  const pages = cloneDefaultWidgetPages()
  enabledOptionalTileIds.forEach((tileId) => {
    if (!OPTIONAL_HOME_TILE_IDS.has(tileId)) return
    const targetPage = DEFAULT_TILE_PAGE_INDEX[tileId]
    if (!Number.isInteger(targetPage)) return
    while (pages.length <= targetPage) {
      pages.push([])
    }
    pages[targetPage] = insertHomeTileByDefaultOrder(pages[targetPage], tileId, targetPage)
  })
  return pages
}

const createDefaultAiAutomationSettings = () => ({
  masterEnabled: DEFAULT_AI_AUTOMATION_SETTINGS.masterEnabled,
  notifyOnlyMode: DEFAULT_AI_AUTOMATION_SETTINGS.notifyOnlyMode,
  quietHoursEnabled: DEFAULT_AI_AUTOMATION_SETTINGS.quietHoursEnabled,
  quietHoursStart: DEFAULT_AI_AUTOMATION_SETTINGS.quietHoursStart,
  quietHoursEnd: DEFAULT_AI_AUTOMATION_SETTINGS.quietHoursEnd,
  conflictCooldownSec: DEFAULT_AI_AUTOMATION_SETTINGS.conflictCooldownSec,
  dedupeWindowSec: DEFAULT_AI_AUTOMATION_SETTINGS.dedupeWindowSec,
  modules: {
    chat: { ...DEFAULT_AI_AUTOMATION_SETTINGS.modules.chat },
    map: { ...DEFAULT_AI_AUTOMATION_SETTINGS.modules.map },
    shopping: { ...DEFAULT_AI_AUTOMATION_SETTINGS.modules.shopping },
  },
})

const normalizeBackupReminderIntervalHours = (value, fallback = BACKUP_REMINDER_DEFAULT_INTERVAL_HOURS) => {
  return clamp(
    toInt(value, fallback),
    BACKUP_REMINDER_MIN_INTERVAL_HOURS,
    BACKUP_REMINDER_MAX_INTERVAL_HOURS,
  )
}

const normalizeBackupCopyTone = (value, fallback = DEFAULT_BACKUP_COPY_TONE) => {
  return BACKUP_COPY_TONE_VALUES.includes(value) ? value : fallback
}

const normalizeMoreFeatureToggleId = (value) => {
  const normalized = typeof value === 'string' ? value.trim() : ''
  return MORE_FEATURE_TOGGLE_IDS.includes(normalized) ? normalized : ''
}

const createDefaultMoreSettings = () => ({
  featureToggles: { ...DEFAULT_MORE_FEATURE_TOGGLES },
})

const normalizeMoreFeatureToggles = (input = {}) => {
  const source = input && typeof input === 'object' ? input : {}
  return Object.fromEntries(
    MORE_FEATURE_TOGGLE_IDS.map((toggleId) => [
      toggleId,
      typeof source[toggleId] === 'boolean'
        ? source[toggleId]
        : DEFAULT_MORE_FEATURE_TOGGLES[toggleId],
    ]),
  )
}

const normalizeMoreSettings = (input = {}) => {
  const source = input && typeof input === 'object' ? input : {}
  return {
    featureToggles: normalizeMoreFeatureToggles(source.featureToggles),
  }
}

const getEnabledOptionalHomeTileIdsFromMoreSettings = (moreSettings = {}) => {
  void normalizeMoreSettings(moreSettings)
  return []
}

const normalizeUserAiContextText = (value, maxLength = 160) => {
  if (typeof value !== 'string') return ''
  return value.trim().replace(/\s+/g, ' ').slice(0, maxLength)
}

const normalizeUserAiContextGender = (value) => {
  const normalized = normalizeUserAiContextText(value, USER_AI_CONTEXT_FIELD_LIMITS.gender).toLowerCase()
  if (normalized === 'female') return 'female'
  if (normalized === 'male') return 'male'
  if (normalized === 'other') return 'other'
  return normalized
}

const normalizeUserAiContextBirthday = (value) => {
  const normalized = normalizeUserAiContextText(value, USER_AI_CONTEXT_FIELD_LIMITS.birthday)
  if (!normalized) return ''
  const dateMatch = normalized.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  return dateMatch ? normalized : normalized.slice(0, USER_AI_CONTEXT_FIELD_LIMITS.birthday)
}

const createUserAiContextField = (key, promptLabel, value) => {
  const normalizedValue = normalizeUserAiContextText(
    value,
    USER_AI_CONTEXT_FIELD_LIMITS[key] || 160,
  )
  if (!normalizedValue) return null
  return {
    key,
    promptLabel,
    value: normalizedValue,
    promptLine: `${promptLabel}: ${normalizedValue}`,
  }
}

const buildUserAiContextSummary = (rawUser = {}, options = {}) => {
  const source = rawUser && typeof rawUser === 'object' ? rawUser : {}
  const overrideName = normalizeUserAiContextText(options.displayName, USER_AI_CONTEXT_FIELD_LIMITS.name)
  const displayName = overrideName || normalizeUserAiContextText(source.name, USER_AI_CONTEXT_FIELD_LIMITS.name)

  const fields = [
    createUserAiContextField('name', 'Display name', displayName || 'User'),
    createUserAiContextField('gender', 'Gender', normalizeUserAiContextGender(source.gender)),
    createUserAiContextField('birthday', 'Birthday', normalizeUserAiContextBirthday(source.birthday)),
    createUserAiContextField('occupation', 'Occupation', source.occupation),
    createUserAiContextField('relationship', 'Relationship setting', source.relationship),
    createUserAiContextField('bio', 'Profile bio', source.bio),
  ].filter(Boolean)

  const sourceForMissing = {
    ...source,
    name: displayName || source.name,
  }
  const missingRecommendedKeys = USER_AI_CONTEXT_RECOMMENDED_KEYS.filter(
    (key) => !normalizeUserAiContextText(sourceForMissing[key], USER_AI_CONTEXT_FIELD_LIMITS[key] || 160),
  )
  const promptText = [
    'User profile context:',
    ...fields.map((field) => `- ${field.promptLine}`),
  ].join('\n')

  return {
    fields,
    missingRecommendedKeys,
    promptText,
    hasRecommendedBaseline: missingRecommendedKeys.length === 0,
  }
}

const normalizePushError = (value, fallback = '') => {
  if (typeof value !== 'string') return fallback
  const trimmed = value.trim()
  return trimmed.length > 240 ? trimmed.slice(0, 240) : trimmed
}

const sanitizeKnowledgePointId = (value) => {
  const raw = typeof value === 'string' ? value.trim() : ''
  if (!raw) return ''
  const normalized = raw.slice(0, MAX_KNOWLEDGE_POINT_ID_CHARS)
  return /^[a-z0-9_-]+$/i.test(normalized) ? normalized : ''
}

const createKnowledgePointId = () => `kp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

const normalizeWorldText = (value, fallback = '') => {
  if (typeof value !== 'string') return typeof fallback === 'string' ? fallback : ''
  const trimmed = value.trim()
  return trimmed.length <= MAX_GLOBAL_WORLDVIEW_CHARS
    ? trimmed
    : trimmed.slice(0, MAX_GLOBAL_WORLDVIEW_CHARS)
}

const normalizeKnowledgePointTags = (rawTags) => {
  if (!Array.isArray(rawTags)) return []
  const unique = []
  rawTags.forEach((item) => {
    const tag = typeof item === 'string' ? item.trim().slice(0, MAX_KNOWLEDGE_POINT_TAG_CHARS) : ''
    if (!tag || unique.includes(tag)) return
    unique.push(tag)
  })
  return unique.slice(0, MAX_KNOWLEDGE_POINT_TAGS)
}

const normalizeKnowledgePoint = (rawPoint = {}, fallbackIndex = 0) => {
  const source = rawPoint && typeof rawPoint === 'object' ? rawPoint : {}
  const title =
    typeof source.title === 'string'
      ? source.title.trim().slice(0, MAX_KNOWLEDGE_POINT_TITLE_CHARS)
      : ''
  const content =
    typeof source.content === 'string'
      ? source.content.trim().slice(0, MAX_KNOWLEDGE_POINT_CONTENT_CHARS)
      : ''
  if (!title && !content) return null

  const id =
    sanitizeKnowledgePointId(source.id) ||
    `kp_${Date.now()}_${fallbackIndex}_${Math.random().toString(36).slice(2, 6)}`
  const createdAtRaw = Number(source.createdAt)
  const updatedAtRaw = Number(source.updatedAt)
  const now = Date.now()

  return {
    id,
    title: title || '知识点',
    content: content || title,
    tags: normalizeKnowledgePointTags(source.tags),
    enabled: source.enabled !== false,
    createdAt:
      Number.isFinite(createdAtRaw) && createdAtRaw > 0 ? Math.floor(createdAtRaw) : now,
    updatedAt:
      Number.isFinite(updatedAtRaw) && updatedAtRaw > 0 ? Math.floor(updatedAtRaw) : now,
  }
}

const normalizeKnowledgePointList = (rawPoints) => {
  if (!Array.isArray(rawPoints)) return []
  const output = []
  const seen = new Set()
  rawPoints.forEach((item, index) => {
    const normalized = normalizeKnowledgePoint(item, index)
    if (!normalized) return
    if (seen.has(normalized.id)) return
    seen.add(normalized.id)
    output.push(normalized)
  })
  return output.slice(0, MAX_KNOWLEDGE_POINTS)
}

const normalizeKnowledgePointMatchValue = (value, maxLength = 240) => {
  if (typeof value !== 'string') return ''
  return value.trim().toLowerCase().replace(/\s+/g, ' ').slice(0, maxLength)
}

const tokenizeKnowledgePointMatchText = (value) => {
  const normalized = normalizeKnowledgePointMatchValue(value)
  if (!normalized) return []
  return [
    ...new Set(
      normalized
        .split(/[^a-z0-9\u00c0-\u024f\u4e00-\u9fff_-]+/i)
        .map((token) => token.trim())
        .filter((token) => token.length >= 2 && !KNOWLEDGE_POINT_MATCH_STOP_WORDS.has(token)),
    ),
  ]
}

const buildKnowledgePointMatchContext = (options = {}) => {
  const normalizedTexts = Array.isArray(options.texts)
    ? options.texts
        .map((value) => normalizeKnowledgePointMatchValue(value))
        .filter(Boolean)
        .slice(0, 12)
    : []
  const normalizedTags = Array.isArray(options.tags)
    ? options.tags
        .map((value) => normalizeKnowledgePointMatchValue(value, MAX_KNOWLEDGE_POINT_TAG_CHARS))
        .filter(Boolean)
        .slice(0, MAX_KNOWLEDGE_POINT_TAGS)
    : []

  return {
    phrases: normalizedTexts.filter((value) => value.length >= 4).slice(0, 8),
    tokens: [...new Set(normalizedTexts.flatMap((value) => tokenizeKnowledgePointMatchText(value)))].slice(0, 24),
    tags: [
      ...new Set(
        normalizedTags.flatMap((value) => [value, ...tokenizeKnowledgePointMatchText(value)]),
      ),
    ].slice(0, 24),
  }
}

const sanitizeEncyclopediaEntryId = sanitizeKnowledgePointId
const createEncyclopediaEntryId = createKnowledgePointId
const normalizeEncyclopediaEntryTags = normalizeKnowledgePointTags
const normalizeEncyclopediaEntry = normalizeKnowledgePoint
const normalizeEncyclopediaEntryList = normalizeKnowledgePointList
const buildEncyclopediaEntryMatchContext = buildKnowledgePointMatchContext

const normalizeWorldPackIdList = (value = []) => {
  const seen = new Set()
  const result = []
  ;(Array.isArray(value) ? value : []).forEach((item) => {
    const id = typeof item === 'string' ? item.trim() : ''
    if (!id || seen.has(id)) return
    seen.add(id)
    result.push(id)
  })
  return result.slice(0, 24)
}

const normalizeWorldPackEnablements = (value = {}) => {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {}
  return Object.fromEntries(
    Object.entries(source)
      .map(([packId, raw]) => {
        const id = typeof packId === 'string' ? packId.trim() : ''
        const enablement = raw && typeof raw === 'object' ? raw : {}
        if (!id) return null
        return [
          id,
          {
            packId: id,
            enabledAt: toInt(enablement.enabledAt, 0),
            fitStatus: typeof enablement.fitStatus === 'string' ? enablement.fitStatus : '',
            reviewSnapshot:
              enablement.reviewSnapshot && typeof enablement.reviewSnapshot === 'object'
                ? { ...enablement.reviewSnapshot }
                : {},
          },
        ]
      })
      .filter(Boolean),
  )
}

const normalizeUserWorldKernel = (rawUser = {}, fallbackGlobalWorldview = DEFAULT_GLOBAL_WORLDVIEW) => {
  const source = rawUser && typeof rawUser === 'object' ? rawUser : {}
  const rawGlobalWorldview =
    typeof source.globalWorldview === 'string'
      ? source.globalWorldview
      : typeof source.worldBook === 'string'
        ? source.worldBook
        : fallbackGlobalWorldview

  return {
    globalWorldview: normalizeWorldText(rawGlobalWorldview, fallbackGlobalWorldview),
    encyclopediaEntries: normalizeEncyclopediaEntryList(
      Array.isArray(source.encyclopediaEntries) ? source.encyclopediaEntries : source.knowledgePoints,
    ),
    worldBookSourceLinks: normalizeWorldBookSourceLinks(source.worldBookSourceLinks),
    profileTemplates: normalizeProfileTemplates(
      Array.isArray(source.profileTemplates) && source.profileTemplates.length > 0
        ? source.profileTemplates
        : createDefaultProfileTemplatePresets(),
    ),
    worldPacks: normalizeWorldPacks(source.worldPacks),
    worldProfileAnalysis: normalizeWorldProfile(source.worldProfileAnalysis),
    enabledWorldPackIds: normalizeWorldPackIdList(source.enabledWorldPackIds),
    worldPackEnablements: normalizeWorldPackEnablements(source.worldPackEnablements),
    activeWorldPackId: typeof source.activeWorldPackId === 'string' && source.activeWorldPackId.trim()
      ? source.activeWorldPackId.trim()
      : DEFAULT_WORLD_PACK_ID,
    worldPackActivation: normalizeWorldPackActivation(
      source.worldPackActivation,
      typeof source.activeWorldPackId === 'string' && source.activeWorldPackId.trim()
        ? source.activeWorldPackId.trim()
        : DEFAULT_WORLD_PACK_ID,
    ),
  }
}

const normalizeUserAvatarImageSource = (rawUser = {}) => {
  const legacyAvatar = typeof rawUser?.avatar === 'string' ? rawUser.avatar : ''
  const normalized = normalizeImageSource(rawUser?.avatarImage, {
    alt: typeof rawUser?.name === 'string' ? rawUser.name : 'User',
  })
  if (normalized.sourceType !== 'none') return normalized
  return normalizeImageSource(
    {
      imageSourceType: legacyAvatar ? 'url' : 'none',
      imageUrl: legacyAvatar,
    },
    { alt: typeof rawUser?.name === 'string' ? rawUser.name : 'User' },
  )
}

const normalizeNonNegativeTimestamp = (value, fallback = 0) => {
  const num = Number(value)
  if (!Number.isFinite(num) || num < 0) return Math.max(0, Math.floor(fallback))
  return Math.floor(num)
}

const normalizeClockTime = (value, fallback = '00:00') => {
  const fallbackMatch = typeof fallback === 'string' ? fallback.match(/^([01]?\d|2[0-3]):([0-5]\d)$/) : null
  const fallbackNormalized = fallbackMatch
    ? `${fallbackMatch[1].padStart(2, '0')}:${fallbackMatch[2]}`
    : '00:00'

  if (typeof value !== 'string') return fallbackNormalized
  const match = value.trim().match(/^([01]?\d|2[0-3]):([0-5]\d)$/)
  if (!match) return fallbackNormalized
  return `${match[1].padStart(2, '0')}:${match[2]}`
}

const clockTimeToMinutes = (value, fallback = 0) => {
  const match = typeof value === 'string' ? value.match(/^([01]\d|2[0-3]):([0-5]\d)$/) : null
  if (!match) return fallback
  return Number(match[1]) * 60 + Number(match[2])
}

const minuteOfDayInTimeZone = (baseAt = Date.now(), timeZone = '') => {
  const ts = Number.isFinite(Number(baseAt)) ? Number(baseAt) : Date.now()
  const zone = typeof timeZone === 'string' && timeZone.trim() ? timeZone.trim() : ''
  const date = new Date(ts)
  if (Number.isNaN(date.getTime())) return 0

  const readFromParts = (parts) => {
    const hourPart = parts.find((part) => part.type === 'hour')?.value
    const minutePart = parts.find((part) => part.type === 'minute')?.value
    const hour = Number(hourPart)
    const minute = Number(minutePart)
    if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null
    return hour * 60 + minute
  }

  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: zone || undefined,
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })
    const minutes = readFromParts(formatter.formatToParts(date))
    if (minutes !== null) return minutes
  } catch {
    // Fall back to local time below.
  }

  return date.getHours() * 60 + date.getMinutes()
}

const normalizeAiAutomationSettings = (input) => {
  const source = input && typeof input === 'object' ? input : {}
  const moduleInput = source.modules && typeof source.modules === 'object' ? source.modules : {}

  const normalizedModules = Object.fromEntries(
    AI_AUTOMATION_MODULE_KEYS.map((moduleKey) => {
      const fallback = DEFAULT_AI_AUTOMATION_SETTINGS.modules[moduleKey]
      const rawModule = moduleInput[moduleKey] && typeof moduleInput[moduleKey] === 'object'
        ? moduleInput[moduleKey]
        : {}

      return [
        moduleKey,
        {
          enabled:
            typeof rawModule.enabled === 'boolean' ? rawModule.enabled : fallback.enabled,
          priority: clamp(toInt(rawModule.priority, fallback.priority), 1, 1000),
        },
      ]
    }),
  )

  return {
    masterEnabled:
      typeof source.masterEnabled === 'boolean'
        ? source.masterEnabled
        : DEFAULT_AI_AUTOMATION_SETTINGS.masterEnabled,
    notifyOnlyMode:
      typeof source.notifyOnlyMode === 'boolean'
        ? source.notifyOnlyMode
        : DEFAULT_AI_AUTOMATION_SETTINGS.notifyOnlyMode,
    quietHoursEnabled:
      typeof source.quietHoursEnabled === 'boolean'
        ? source.quietHoursEnabled
        : DEFAULT_AI_AUTOMATION_SETTINGS.quietHoursEnabled,
    quietHoursStart: normalizeClockTime(
      source.quietHoursStart,
      DEFAULT_AI_AUTOMATION_SETTINGS.quietHoursStart,
    ),
    quietHoursEnd: normalizeClockTime(
      source.quietHoursEnd,
      DEFAULT_AI_AUTOMATION_SETTINGS.quietHoursEnd,
    ),
    conflictCooldownSec: clamp(
      toInt(source.conflictCooldownSec, DEFAULT_AI_AUTOMATION_SETTINGS.conflictCooldownSec),
      5,
      600,
    ),
    dedupeWindowSec: clamp(
      toInt(source.dedupeWindowSec, DEFAULT_AI_AUTOMATION_SETTINGS.dedupeWindowSec),
      10,
      1800,
    ),
    modules: normalizedModules,
  }
}

const ensureMinimumHomePages = (pages) => {
  const nextPages = pages.map((page) => [...page])
  while (nextPages.length < MIN_HOME_PAGES) {
    nextPages.push([])
  }
  return nextPages
}

const isCustomWidgetId = (tileId) =>
  typeof tileId === 'string' && tileId.startsWith(CUSTOM_WIDGET_ID_PREFIX)

const normalizeCustomWidgetSize = (size) =>
  CUSTOM_WIDGET_SIZES.includes(size) ? size : '2x2'

const normalizeCustomWidgets = (widgetsInput) => {
  if (!Array.isArray(widgetsInput)) return []

  const usedIds = new Set()
  return widgetsInput
    .map((widget, index) => {
      if (!widget || typeof widget !== 'object') return null

      const inputId = typeof widget.id === 'string' ? widget.id : ''
      const id =
        inputId && isCustomWidgetId(inputId)
          ? inputId
          : `${CUSTOM_WIDGET_ID_PREFIX}${Date.now()}_${index}`

      if (usedIds.has(id)) return null
      usedIds.add(id)

      const name =
        typeof widget.name === 'string' && widget.name.trim()
          ? widget.name.trim()
          : `自定义组件 ${index + 1}`

      const code = typeof widget.code === 'string' ? widget.code : ''

      return {
        id,
        name,
        size: normalizeCustomWidgetSize(widget.size),
        code,
        action: normalizeCustomWidgetAction(widget.action),
        createdAt:
          typeof widget.createdAt === 'number' && Number.isFinite(widget.createdAt)
            ? widget.createdAt
            : Date.now(),
      }
    })
    .filter(Boolean)
}

const normalizeHomeWidgetPages = (pages, customWidgetIds = [], options = {}) => {
  const dynamicHomeTileIds = Array.isArray(options.dynamicHomeTileIds)
    ? options.dynamicHomeTileIds.filter(isWorldAppHomeTileId)
    : []
  const allowedIds = new Set([...CORE_HOME_TILE_IDS, ...customWidgetIds, ...dynamicHomeTileIds])
  const shouldUseDefaultWhenEmpty = options.defaultWhenEmpty !== false
  const enabledOptionalTileIds = new Set(
    Array.isArray(options.enabledOptionalTileIds) ? options.enabledOptionalTileIds : [],
  )

  if (!Array.isArray(pages)) {
    return buildDefaultHomeWidgetPages([...enabledOptionalTileIds])
  }

  const seen = new Set()
  const normalized = pages
    .filter((page) => Array.isArray(page))
    .map((page) =>
      page
        .map((tileId) => HOME_TILE_ALIASES[tileId] || tileId)
        .filter((tileId) => {
          if (HIDDEN_FRONTEND_HOME_TILE_IDS.has(tileId)) return false
          if (OPTIONAL_HOME_TILE_IDS.has(tileId) && !enabledOptionalTileIds.has(tileId)) return false
          if (!allowedIds.has(tileId)) return false
          if (seen.has(tileId)) return false
          seen.add(tileId)
          return true
        }),
    )

  if (normalized.length === 0) {
    return shouldUseDefaultWhenEmpty
      ? buildDefaultHomeWidgetPages([...enabledOptionalTileIds])
      : ensureMinimumHomePages([])
  }

  const withMinimumPages = ensureMinimumHomePages(normalized)

  return withMinimumPages
}

const builtInHomeTileSizeKey = (tileId) => {
  if (tileId === 'music') return '4x2'
  if (tileId === 'quick_heart' || tileId === 'quick_disc') return '1x1'
  if (isWorldAppHomeTileId(tileId)) return '1x1'
  if (typeof tileId === 'string' && tileId.startsWith('app_')) return '1x1'
  return '2x2'
}

const createHomeLayoutSlotPlacementsFromPages = (pages, templateIds) => {
  const normalizedTemplateIds = normalizeHomeLayoutTemplateIds(
    templateIds,
    Array.isArray(pages) ? pages.length || MIN_HOME_PAGES : MIN_HOME_PAGES,
  )
  return (Array.isArray(pages) ? pages : []).map((page, pageIndex) => {
    const template = getHomeLayoutTemplate(normalizedTemplateIds[pageIndex])
    return assignHomeLayoutSlots(page, template, builtInHomeTileSizeKey).placements.map((placement) => ({
      slotId: placement.slot.id,
      tileId: placement.tileId,
    }))
  })
}

const createCustomWidgetId = () =>
  `${CUSTOM_WIDGET_ID_PREFIX}${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

const createNotificationId = () =>
  `note_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

const createApiReportId = () =>
  `api_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

const createAiAutomationTaskId = () =>
  `auto_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

const normalizeLockClockStyle = (value) =>
  VALID_LOCK_CLOCK_STYLES.includes(value) ? value : DEFAULT_LOCK_CLOCK_STYLE

const normalizeWallpaperMode = (value, fallback = DEFAULT_WALLPAPER_MODE) =>
  VALID_WALLPAPER_MODES.includes(value) ? value : fallback

const normalizeThemeId = (themeId, fallback = AVAILABLE_THEMES[0]?.id || 'default') => {
  const normalized = typeof themeId === 'string' ? themeId.trim() : ''
  const migrated = LEGACY_THEME_MIGRATIONS[normalized] || normalized
  return AVAILABLE_THEMES.some((theme) => theme.id === migrated) ? migrated : fallback
}

const normalizeWallpaperAssetId = (value) =>
  typeof value === 'string' ? value.trim().slice(0, 160) : ''

const isLegacyThemeWallpaper = (value) =>
  typeof value === 'string' && LEGACY_THEME_WALLPAPERS.has(value.trim())

const normalizeNotification = (rawNote) => {
  if (!rawNote || typeof rawNote !== 'object') return null

  const title = typeof rawNote.title === 'string' ? rawNote.title.trim() : ''
  const content = typeof rawNote.content === 'string' ? rawNote.content.trim() : ''
  if (!title && !content) return null

  const createdAt =
    typeof rawNote.createdAt === 'number' && Number.isFinite(rawNote.createdAt)
      ? Math.max(0, Math.floor(rawNote.createdAt))
      : Date.now()

  return {
    id:
      typeof rawNote.id === 'string' && rawNote.id.trim()
        ? rawNote.id.trim()
        : createNotificationId(),
    title: title || '系统消息',
    content,
    icon:
      typeof rawNote.icon === 'string' && rawNote.icon.trim()
        ? rawNote.icon.trim()
        : 'fas fa-bell',
    route:
      typeof rawNote.route === 'string' && rawNote.route.trim()
        ? rawNote.route.trim()
        : '',
    source:
      typeof rawNote.source === 'string' && rawNote.source.trim()
        ? rawNote.source.trim()
        : 'system',
    pushTitle:
      typeof rawNote.pushTitle === 'string' && rawNote.pushTitle.trim()
        ? rawNote.pushTitle.trim()
        : '',
    pushBody:
      typeof rawNote.pushBody === 'string' && rawNote.pushBody.trim()
        ? rawNote.pushBody.trim()
        : '',
    pushIconUrl:
      typeof rawNote.pushIconUrl === 'string' && rawNote.pushIconUrl.trim()
        ? rawNote.pushIconUrl.trim()
        : '',
    createdAt,
    read: Boolean(rawNote.read),
  }
}

const normalizeApiReport = (rawReport) => {
  if (!rawReport || typeof rawReport !== 'object') return null

  const level = rawReport.level === 'error' ? 'error' : 'info'
  const module = typeof rawReport.module === 'string' && rawReport.module.trim()
    ? rawReport.module.trim()
    : 'chat'
  const action = typeof rawReport.action === 'string' && rawReport.action.trim()
    ? rawReport.action.trim()
    : 'call_ai'

  const createdAt = Number(rawReport.createdAt)

  return {
    id:
      typeof rawReport.id === 'string' && rawReport.id.trim()
        ? rawReport.id.trim()
        : createApiReportId(),
    level,
    module,
    action,
    provider:
      typeof rawReport.provider === 'string' && rawReport.provider.trim()
        ? rawReport.provider.trim()
        : '',
    model:
      typeof rawReport.model === 'string' && rawReport.model.trim()
        ? rawReport.model.trim()
        : '',
    statusCode:
      Number.isFinite(Number(rawReport.statusCode)) && Number(rawReport.statusCode) > 0
        ? Math.floor(Number(rawReport.statusCode))
        : 0,
    code:
      typeof rawReport.code === 'string' && rawReport.code.trim()
        ? rawReport.code.trim()
        : '',
    message:
      typeof rawReport.message === 'string' && rawReport.message.trim()
        ? rawReport.message.trim()
        : '',
    createdAt: Number.isFinite(createdAt) ? Math.max(0, Math.floor(createdAt)) : Date.now(),
  }
}

const createChatTruthEventId = () =>
  `truth_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

const clampTruthMetric = (value, fallback = 0) => clamp(toInt(value, fallback), 0, 100)

const normalizeRelationshipStage = (value, fallback = 'neutral') => {
  if (value === 'distant') return 'distant'
  if (value === 'warm') return 'warm'
  if (value === 'close') return 'close'
  if (value === 'strained') return 'strained'
  return fallback
}

const deriveRelationshipStage = (rawMetrics = {}) => {
  const affinity = clampTruthMetric(rawMetrics.affinity, DEFAULT_CHAT_TRUTH_METRICS.affinity)
  const trust = clampTruthMetric(rawMetrics.trust, DEFAULT_CHAT_TRUTH_METRICS.trust)
  const distance = clampTruthMetric(rawMetrics.distance, DEFAULT_CHAT_TRUTH_METRICS.distance)
  const tension = clampTruthMetric(rawMetrics.tension, DEFAULT_CHAT_TRUTH_METRICS.tension)

  if (tension >= 70) return 'strained'
  if (affinity >= 78 && trust >= 68 && distance <= 35) return 'close'
  if (affinity >= 62 && trust >= 55 && distance <= 50) return 'warm'
  if (distance >= 75 || trust <= 30) return 'distant'
  return 'neutral'
}

const normalizeChatTruthEntity = (rawEntity, fallbackKey = '') => {
  const entity = rawEntity && typeof rawEntity === 'object' ? rawEntity : {}
  const entityKey =
    typeof entity.entityKey === 'string' && entity.entityKey.trim()
      ? entity.entityKey.trim()
      : fallbackKey
  if (!entityKey) return null

  const contactId = Number(entity.contactId)
  const profileId = Number(entity.profileId)
  const createdAt = Number(entity.createdAt)
  const updatedAt = Number(entity.updatedAt)
  const relationshipStage = normalizeRelationshipStage(
    entity.relationshipStage,
    deriveRelationshipStage(entity),
  )

  return {
    entityKey,
    contactId: Number.isFinite(contactId) && contactId > 0 ? Math.floor(contactId) : 0,
    profileId: Number.isFinite(profileId) && profileId > 0 ? Math.floor(profileId) : 0,
    kind:
      typeof entity.kind === 'string' && entity.kind.trim()
        ? entity.kind.trim()
        : 'role',
    displayName:
      typeof entity.displayName === 'string' && entity.displayName.trim()
        ? entity.displayName.trim()
        : '',
    affinity: clampTruthMetric(entity.affinity, DEFAULT_CHAT_TRUTH_METRICS.affinity),
    trust: clampTruthMetric(entity.trust, DEFAULT_CHAT_TRUTH_METRICS.trust),
    distance: clampTruthMetric(entity.distance, DEFAULT_CHAT_TRUTH_METRICS.distance),
    dependency: clampTruthMetric(entity.dependency, DEFAULT_CHAT_TRUTH_METRICS.dependency),
    tension: clampTruthMetric(entity.tension, DEFAULT_CHAT_TRUTH_METRICS.tension),
    relationshipStage,
    lastWarmMomentAt:
      Number.isFinite(Number(entity.lastWarmMomentAt))
        ? Math.max(0, Math.floor(Number(entity.lastWarmMomentAt)))
        : 0,
    lastConflictAt:
      Number.isFinite(Number(entity.lastConflictAt))
        ? Math.max(0, Math.floor(Number(entity.lastConflictAt)))
        : 0,
    lastInteractionAt:
      Number.isFinite(Number(entity.lastInteractionAt))
        ? Math.max(0, Math.floor(Number(entity.lastInteractionAt)))
        : 0,
    lastUserMessageAt:
      Number.isFinite(Number(entity.lastUserMessageAt))
        ? Math.max(0, Math.floor(Number(entity.lastUserMessageAt)))
        : 0,
    lastAssistantMessageAt:
      Number.isFinite(Number(entity.lastAssistantMessageAt))
        ? Math.max(0, Math.floor(Number(entity.lastAssistantMessageAt)))
        : 0,
    userMessageCount: Math.max(0, toInt(entity.userMessageCount, 0)),
    assistantMessageCount: Math.max(0, toInt(entity.assistantMessageCount, 0)),
    manualTriggerCount: Math.max(0, toInt(entity.manualTriggerCount, 0)),
    autoTriggerCount: Math.max(0, toInt(entity.autoTriggerCount, 0)),
    rerollCount: Math.max(0, toInt(entity.rerollCount, 0)),
    notifyOnlySkipCount: Math.max(0, toInt(entity.notifyOnlySkipCount, 0)),
    resumeSettlementCount: Math.max(0, toInt(entity.resumeSettlementCount, 0)),
    createdAt: Number.isFinite(createdAt) && createdAt > 0 ? Math.floor(createdAt) : Date.now(),
    updatedAt: Number.isFinite(updatedAt) && updatedAt > 0 ? Math.floor(updatedAt) : Date.now(),
  }
}

const normalizeChatTruthEvent = (rawEvent = {}) => {
  const event = rawEvent && typeof rawEvent === 'object' ? rawEvent : {}
  const entityKey =
    typeof event.entityKey === 'string' && event.entityKey.trim() ? event.entityKey.trim() : ''
  if (!entityKey) return null

  const action =
    typeof event.action === 'string' && event.action.trim()
      ? event.action.trim()
      : 'interaction'
  const at = Number(event.at)
  const payload = event.payload && typeof event.payload === 'object' ? event.payload : {}

  return {
    id:
      typeof event.id === 'string' && event.id.trim()
        ? event.id.trim()
        : createChatTruthEventId(),
    entityKey,
    action,
    at: Number.isFinite(at) && at > 0 ? Math.floor(at) : Date.now(),
    payload: {
      ...payload,
    },
  }
}

const normalizeTruthState = (rawTruthState) => {
  const input = rawTruthState && typeof rawTruthState === 'object' ? rawTruthState : {}
  const rawEntities = input.chatEntities && typeof input.chatEntities === 'object'
    ? input.chatEntities
    : {}

  const chatEntities = Object.fromEntries(
    Object.entries(rawEntities)
      .map(([entityKey, value]) => [entityKey, normalizeChatTruthEntity(value, entityKey)])
      .filter(([, value]) => Boolean(value)),
  )

  const chatEvents = Array.isArray(input.chatEvents)
    ? input.chatEvents
        .map((event) => normalizeChatTruthEvent(event))
        .filter(Boolean)
        .sort((a, b) => b.at - a.at)
        .slice(0, MAX_CHAT_TRUTH_EVENTS)
    : []

  const lastUpdatedAt = Number(input.lastUpdatedAt)

  return {
    chatEntities,
    chatEvents,
    lastUpdatedAt:
      Number.isFinite(lastUpdatedAt) && lastUpdatedAt > 0
        ? Math.floor(lastUpdatedAt)
        : Date.now(),
  }
}

export const useSystemStore = defineStore('system', () => {
  const availableThemes = ref(AVAILABLE_THEMES)

  const settings = reactive({
    api: {
      url: DEFAULT_API_URL,
      key: DEFAULT_API_KEY,
      model: DEFAULT_API_MODEL,
      resolvedKind: DEFAULT_API_RESOLVED_KIND,
      presets: [],
      activePresetId: '',
    },
    appearance: {
      currentTheme: 'default',
      wallpaperMode: DEFAULT_WALLPAPER_MODE,
      wallpaperAssetId: '',
      wallpaper: AVAILABLE_THEMES[0].wallpaper,
      showStatusBar: true,
      hapticFeedbackEnabled: true,
      customCss: '',
      scopedCustomCss: normalizeScopedCustomCss(),
      appSkins: normalizeAppSkinSettings(),
      customVars: {},
      appIconOverrides: {},
      entryPresentationOverrides: {},
      appStoreMiniAppPlacements: normalizeAppStoreMiniAppPlacements(),
      homeDesktopSetupVersion: HOME_DESKTOP_SETUP_VERSION,
      homeWidgetPages: cloneDefaultWidgetPages(),
      homeLayoutTemplateIds: cloneDefaultHomeLayoutTemplateIds(),
      homeLayoutSlotPlacements: cloneDefaultHomeLayoutSlotPlacements(),
      customWidgets: [],
      lockClockStyle: DEFAULT_LOCK_CLOCK_STYLE,
      chat: normalizeChatAppearance(),
    },
    system: {
      language: DEFAULT_SYSTEM_LANGUAGE,
      timezone: 'Asia/Shanghai',
      notifications: true,
      realPushEnabled: false,
      pushDisplayMode: 'minimal',
      pushServerUrl: DEFAULT_PUSH_SERVER_URL,
      pushPermission: normalizePushPermission(readPushPermission(), 'default'),
      pushDeviceId: '',
      pushSubscriptionActive: false,
      pushLastSyncedAt: 0,
      pushLastError: '',
      pushVapidPublicKey: '',
      backupReminderEnabled: true,
      backupReminderIntervalHours: BACKUP_REMINDER_DEFAULT_INTERVAL_HOURS,
      backupReminderLastNotifiedAt: 0,
      backupCopyTone: DEFAULT_BACKUP_COPY_TONE,
      softwareUpdate: createInitialSoftwareUpdateState(),
    },
    more: createDefaultMoreSettings(),
    aiAutomation: createDefaultAiAutomationSettings(),
  })

  const user = reactive({
    name: 'V',
    chatStatus: 'idle',
    gender: '',
    birthday: '',
    occupation: '',
    relationship: '',
    bio: '夜之城的自由佣兵。',
    avatar: '',
    avatarImage: normalizeImageSource({ imageSourceType: 'none' }, { alt: 'V' }),
    worldBook: DEFAULT_GLOBAL_WORLDVIEW,
    globalWorldview: DEFAULT_GLOBAL_WORLDVIEW,
    worldBookSourceLinks: [],
    worldPacks: normalizeWorldPacks([]),
    worldProfileAnalysis: normalizeWorldProfile({}),
    enabledWorldPackIds: [],
    worldPackEnablements: {},
    activeWorldPackId: DEFAULT_WORLD_PACK_ID,
    worldPackActivation: normalizeWorldPackActivation({}, DEFAULT_WORLD_PACK_ID),
    knowledgePoints: [],
    encyclopediaEntries: [],
    profileTemplates: createDefaultProfileTemplatePresets(),
  })
  user.knowledgePoints = user.encyclopediaEntries

  const notifications = ref([])
  const apiReports = ref([])
  const aiAutomationQueue = ref([])
  const truthState = reactive(normalizeTruthState())
  const isLocked = ref(true)
  const activeAutoExecution = reactive({
    module: '',
    startedAt: 0,
    reason: '',
  })
  const aiAutomationRuntime = reactive({
    lastExecutedAtByModule: Object.fromEntries(
      AI_AUTOMATION_MODULE_KEYS.map((moduleKey) => [moduleKey, 0]),
    ),
    recentFingerprints: [],
  })
  const aiAutomationHandlers = new Map()

  const currentCustomWidgetIds = () =>
    settings.appearance.customWidgets.map((widget) => widget.id)

  const currentEnabledOptionalHomeTileIds = () =>
    getEnabledOptionalHomeTileIdsFromMoreSettings(settings.more)

  const worldAppHomeTileIdsFromUserSnapshot = (sourceUser = {}) => {
    const source = sourceUser && typeof sourceUser === 'object' ? sourceUser : {}
    const activePackId =
      typeof source.activeWorldPackId === 'string' && source.activeWorldPackId.trim()
        ? source.activeWorldPackId.trim()
        : DEFAULT_WORLD_PACK_ID
    return buildWorldAppEntryRows({
      pack: normalizeWorldPacks(source.worldPacks).find((pack) => pack.id === activePackId) || null,
    }).map((entry) => entry.id)
  }

  const currentWorldAppHomeTileIds = () => worldAppHomeTileIdsFromUserSnapshot(user)

  const normalizeHomeWidgetPagesForCurrentSettings = (
    pages,
    customWidgetIds = currentCustomWidgetIds(),
    options = {},
  ) => {
    const dynamicHomeTileIds = new Set([
      ...currentWorldAppHomeTileIds(),
      ...(Array.isArray(options.dynamicHomeTileIds) ? options.dynamicHomeTileIds : []),
    ])
    return normalizeHomeWidgetPages(pages, customWidgetIds, {
      ...options,
      enabledOptionalTileIds: currentEnabledOptionalHomeTileIds(),
      dynamicHomeTileIds: [...dynamicHomeTileIds],
    })
  }

  const normalizeHomeLayoutTemplateIdsForCurrentPages = (templateIds) =>
    normalizeHomeLayoutTemplateIds(templateIds, settings.appearance.homeWidgetPages.length || MIN_HOME_PAGES)

  const homeTileSizeKey = (tileId) => {
    const customWidget = settings.appearance.customWidgets.find((widget) => widget.id === tileId)
    if (customWidget) return normalizeCustomWidgetSize(customWidget.size)
    return builtInHomeTileSizeKey(tileId)
  }

  const normalizeHomeLayoutSlotPlacementsForCurrentSettings = (slotPlacements) =>
    normalizeHomeLayoutSlotPlacements(
      slotPlacements,
      settings.appearance.homeWidgetPages,
      settings.appearance.homeLayoutTemplateIds,
      homeTileSizeKey,
    )

  const syncHomeLayoutSlotPlacementsFromPages = () => {
    settings.appearance.homeLayoutSlotPlacements = createHomeLayoutSlotPlacementsFromPages(
      settings.appearance.homeWidgetPages,
      settings.appearance.homeLayoutTemplateIds,
    )
  }

  const normalizeCurrentHomeLayoutSlotPlacements = () => {
    settings.appearance.homeLayoutSlotPlacements = normalizeHomeLayoutSlotPlacementsForCurrentSettings(
      settings.appearance.homeLayoutSlotPlacements,
    )
  }

  const keepOnlyExplicitlyPlacedHomeTilesOnPages = (pageIndexes = null) => {
    const pageIndexSet = Array.isArray(pageIndexes)
      ? new Set(pageIndexes.filter((pageIndex) => Number.isInteger(pageIndex)).map((pageIndex) => Math.max(0, pageIndex)))
      : null
    const shouldCleanPage = (pageIndex) => !pageIndexSet || pageIndexSet.has(pageIndex)
    const placedTileIdsByPage = settings.appearance.homeLayoutSlotPlacements.map(
      (page) =>
        new Set(
          (Array.isArray(page) ? page : [])
            .map((placement) => placement?.tileId)
            .filter((tileId) => typeof tileId === 'string' && tileId.trim()),
        ),
    )

    settings.appearance.homeWidgetPages = normalizeHomeWidgetPagesForCurrentSettings(
      settings.appearance.homeWidgetPages.map((page, index) =>
        shouldCleanPage(index)
          ? page.filter((tileId) => placedTileIdsByPage[index]?.has(tileId))
          : page,
      ),
    )
    normalizeCurrentHomeLayoutSlotPlacements()
  }

  const keepOnlyExplicitlyPlacedHomeTilesOnPage = (pageIndex) => {
    const normalizedPageIndex = Number.isInteger(pageIndex) ? Math.max(0, pageIndex) : 0
    keepOnlyExplicitlyPlacedHomeTilesOnPages([normalizedPageIndex])
  }

  const getThemeById = (themeId = '') => {
    const normalizedThemeId = normalizeThemeId(themeId, '')
    if (!normalizedThemeId) return availableThemes.value[0] || null
    return availableThemes.value.find((item) => item.id === normalizedThemeId) || null
  }

  const getThemeWallpaper = (themeId = '') => {
    return getThemeById(themeId || settings.appearance.currentTheme)?.wallpaper || ''
  }

  const useThemeWallpaper = () => {
    settings.appearance.wallpaperMode = DEFAULT_WALLPAPER_MODE
    settings.appearance.wallpaperAssetId = ''
    settings.appearance.wallpaper = getThemeWallpaper(settings.appearance.currentTheme) || ''
    return settings.appearance.wallpaper
  }

  const setAppearanceWallpaperUrl = (nextUrl = '') => {
    const normalizedUrl = typeof nextUrl === 'string' ? nextUrl.trim() : ''
    if (!normalizedUrl) {
      return useThemeWallpaper()
    }

    settings.appearance.wallpaperMode = 'url'
    settings.appearance.wallpaperAssetId = ''
    settings.appearance.wallpaper = normalizedUrl
    return settings.appearance.wallpaper
  }

  const setAppearanceWallpaperAsset = (assetId = '') => {
    const normalizedAssetId = normalizeWallpaperAssetId(assetId)
    if (!normalizedAssetId) {
      useThemeWallpaper()
      return ''
    }

    settings.appearance.wallpaperMode = 'gallery'
    settings.appearance.wallpaperAssetId = normalizedAssetId
    return normalizedAssetId
  }

  const clearAppearanceWallpaperAsset = ({ fallbackToTheme = true } = {}) => {
    settings.appearance.wallpaperAssetId = ''
    if (fallbackToTheme) {
      useThemeWallpaper()
    } else if (settings.appearance.wallpaperMode === 'gallery') {
      settings.appearance.wallpaperMode = 'url'
    }
    return true
  }

  const isMoreFeatureToggleEnabled = (toggleId) => {
    const normalizedId = normalizeMoreFeatureToggleId(toggleId)
    if (!normalizedId) return false
    const normalizedMore = normalizeMoreSettings(settings.more)
    return normalizedMore.featureToggles[normalizedId] === true
  }

  const normalizeCurrentHomeWidgetPages = (options = {}) => {
    settings.appearance.homeWidgetPages = normalizeHomeWidgetPagesForCurrentSettings(
      settings.appearance.homeWidgetPages,
      currentCustomWidgetIds(),
      options,
    )
    normalizeCurrentHomeLayoutSlotPlacements()
    return settings.appearance.homeWidgetPages
  }

  const setMoreFeatureToggle = (toggleId, enabled) => {
    const normalizedId = normalizeMoreFeatureToggleId(toggleId)
    if (!normalizedId) return false
    settings.more = normalizeMoreSettings(settings.more)
    settings.more.featureToggles[normalizedId] = enabled === true
    return true
  }

  const toggleMoreFeatureToggle = (toggleId) => {
    const normalizedId = normalizeMoreFeatureToggleId(toggleId)
    if (!normalizedId) return false
    return setMoreFeatureToggle(normalizedId, !isMoreFeatureToggleEnabled(normalizedId))
  }

  const getUserAiContextSummary = (options = {}) => buildUserAiContextSummary(user, options)

  const syncPushPermissionFromBrowser = () => {
    settings.system.pushPermission = normalizePushPermission(
      readPushPermission(),
      settings.system.pushPermission || 'default',
    )
    return settings.system.pushPermission
  }

  const setPushState = (rawPatch = {}) => {
    const patch = rawPatch && typeof rawPatch === 'object' ? rawPatch : {}
    if ('realPushEnabled' in patch) {
      settings.system.realPushEnabled = patch.realPushEnabled === true
    }
    if ('pushDisplayMode' in patch) {
      settings.system.pushDisplayMode = normalizePushDisplayMode(
        patch.pushDisplayMode,
        settings.system.pushDisplayMode || 'minimal',
      )
    }
    if ('pushServerUrl' in patch) {
      settings.system.pushServerUrl = normalizePushServerUrl(
        patch.pushServerUrl,
        settings.system.pushServerUrl || DEFAULT_PUSH_SERVER_URL,
      )
    }
    if ('pushPermission' in patch) {
      settings.system.pushPermission = normalizePushPermission(
        patch.pushPermission,
        settings.system.pushPermission || 'default',
      )
    }
    if ('pushDeviceId' in patch) {
      settings.system.pushDeviceId =
        typeof patch.pushDeviceId === 'string' ? patch.pushDeviceId.trim().slice(0, 120) : ''
    }
    if ('pushSubscriptionActive' in patch) {
      settings.system.pushSubscriptionActive = patch.pushSubscriptionActive === true
    }
    if ('pushLastSyncedAt' in patch) {
      settings.system.pushLastSyncedAt = normalizeNonNegativeTimestamp(
        patch.pushLastSyncedAt,
        settings.system.pushLastSyncedAt,
      )
    }
    if ('pushLastError' in patch) {
      settings.system.pushLastError = normalizePushError(
        patch.pushLastError,
        settings.system.pushLastError || '',
      )
    }
    if ('pushVapidPublicKey' in patch) {
      settings.system.pushVapidPublicKey =
        typeof patch.pushVapidPublicKey === 'string'
          ? patch.pushVapidPublicKey.trim().slice(0, 160)
          : ''
    }
    return {
      realPushEnabled: settings.system.realPushEnabled,
      pushDisplayMode: settings.system.pushDisplayMode,
      pushServerUrl: settings.system.pushServerUrl,
      pushPermission: settings.system.pushPermission,
      pushDeviceId: settings.system.pushDeviceId,
      pushSubscriptionActive: settings.system.pushSubscriptionActive,
      pushLastSyncedAt: settings.system.pushLastSyncedAt,
      pushLastError: settings.system.pushLastError,
      pushVapidPublicKey: settings.system.pushVapidPublicKey,
    }
  }

  const canDispatchRealPush = () => {
    if (settings.system.notifications === false) return false
    if (settings.system.realPushEnabled !== true) return false
    if (settings.system.pushSubscriptionActive !== true) return false
    if (!settings.system.pushServerUrl || !settings.system.pushDeviceId) return false
    if (typeof document === 'undefined') return false
    return document.hidden === true
  }

  const dispatchNotificationToRealPush = async (notification) => {
    if (!notification || typeof notification !== 'object') {
      return {
        ok: false,
        reason: 'invalid_notification',
      }
    }
    if (!canDispatchRealPush()) {
      return {
        ok: false,
        reason: 'disabled',
      }
    }

    const result = await relayNotificationToPush({
      serverUrl: settings.system.pushServerUrl,
      deviceId: settings.system.pushDeviceId,
      notification: {
        ...notification,
        pushLocale: settings.system.language || 'zh-CN',
        pushDisplayMode: settings.system.pushDisplayMode || 'minimal',
      },
    })

    if (result?.ok) {
      setPushState({
        pushLastSyncedAt: Date.now(),
        pushLastError: '',
      })
      return result
    }

    let nextResult = result
    let reason =
      typeof nextResult?.reason === 'string' ? nextResult.reason : 'push_delivery_failed'
    let message =
      typeof nextResult?.message === 'string' && nextResult.message.trim()
        ? nextResult.message.trim()
        : 'Real push delivery failed.'

    if (reason === 'subscription_not_found') {
      const resyncResult = await syncExistingWebPushSubscription({
        serverUrl: settings.system.pushServerUrl,
        deviceId: settings.system.pushDeviceId,
      })

      if (resyncResult?.ok) {
        setPushState({
          pushDeviceId: resyncResult.deviceId,
          pushSubscriptionActive: true,
          pushLastSyncedAt: Date.now(),
          pushLastError: '',
        })
        nextResult = await relayNotificationToPush({
          serverUrl: settings.system.pushServerUrl,
          deviceId: settings.system.pushDeviceId,
          notification: {
            ...notification,
            pushLocale: settings.system.language || 'zh-CN',
            pushDisplayMode: settings.system.pushDisplayMode || 'minimal',
          },
        })
        if (nextResult?.ok) {
          setPushState({
            pushLastSyncedAt: Date.now(),
            pushLastError: '',
          })
          return nextResult
        }
        reason =
          typeof nextResult?.reason === 'string' ? nextResult.reason : 'push_delivery_failed'
        message =
          typeof nextResult?.message === 'string' && nextResult.message.trim()
            ? nextResult.message.trim()
            : 'Real push delivery failed after resync.'
      }
    }

    const shouldDeactivate =
      reason === 'subscription_not_found' || reason === 'subscription_expired'

    setPushState({
      pushLastError: message,
      pushSubscriptionActive: shouldDeactivate ? false : settings.system.pushSubscriptionActive,
    })

    addApiReport({
      level: 'error',
      module: 'push',
      action: 'relay_notification',
      code: reason,
      message,
      createdAt: Date.now(),
    })

    return result
  }

  const setTheme = (themeId) => {
    const theme = getThemeById(normalizeThemeId(themeId))
    if (!theme) return
    settings.appearance.currentTheme = theme.id
    if (settings.appearance.wallpaperMode === DEFAULT_WALLPAPER_MODE) {
      settings.appearance.wallpaperAssetId = ''
      settings.appearance.wallpaper = theme.wallpaper
    }
  }

  const cycleTheme = () => {
    const currentIndex = availableThemes.value.findIndex(
      (item) => item.id === settings.appearance.currentTheme,
    )
    const nextIndex = currentIndex < 0 ? 0 : (currentIndex + 1) % availableThemes.value.length
    setTheme(availableThemes.value[nextIndex].id)
  }

  const setCustomCss = (cssText) => {
    settings.appearance.customCss = cssText || ''
  }

  const setScopedCustomCss = (scopeKey, updates = {}) => {
    const current = normalizeScopedCustomCss(settings.appearance.scopedCustomCss)
    if (!current[scopeKey]) return false
    settings.appearance.scopedCustomCss = normalizeScopedCustomCss({
      ...current,
      [scopeKey]: {
        ...current[scopeKey],
        ...(updates && typeof updates === 'object' ? updates : {}),
      },
    })
    return true
  }

  const setAppSkin = (scope, updates = {}) => {
    const target = resolveAppSkinTargetForScope(scope)
    if (!target) return false
    const current = normalizeAppSkinSettings(settings.appearance.appSkins)
    const next = normalizeAppSkinSettings({
      ...current,
      [target.scope]: {
        ...(current[target.scope] || {}),
        ...(updates && typeof updates === 'object' ? updates : {}),
      },
    })
    settings.appearance.appSkins = next
    return true
  }

  const resetAppSkin = (scope) => {
    const target = resolveAppSkinTargetForScope(scope)
    if (!target) return false
    const current = normalizeAppSkinSettings(settings.appearance.appSkins)
    const existed = Boolean(current[target.scope])
    const next = { ...current }
    delete next[target.scope]
    settings.appearance.appSkins = normalizeAppSkinSettings(next)
    return existed
  }

  const setAppIconOverride = (appId, override = {}) => {
    const normalizedId = typeof appId === 'string' ? appId.trim() : ''
    if (!normalizedId) return false
    const nextOverrides = {
      ...(settings.appearance.appIconOverrides || {}),
      [normalizedId]: override,
    }
    const normalized = normalizeAppIconOverrides(nextOverrides)
    if (!normalized[normalizedId]) return false
    settings.appearance.appIconOverrides = normalized
    return true
  }

  const clearAppIconOverride = (appId) => {
    const normalizedId = typeof appId === 'string' ? appId.trim() : ''
    if (!normalizedId) return false
    const nextOverrides = { ...(settings.appearance.appIconOverrides || {}) }
    const existed = Boolean(nextOverrides[normalizedId])
    delete nextOverrides[normalizedId]
    settings.appearance.appIconOverrides = normalizeAppIconOverrides(nextOverrides)
    return existed
  }

  const setEntryPresentationOverride = (entryId, override = {}) => {
    const normalizedId = normalizeEntryOverrideId(entryId)
    if (!normalizedId) return false
    const nextOverrides = {
      ...(settings.appearance.entryPresentationOverrides || {}),
      [normalizedId]: override,
    }
    const normalized = normalizeEntryPresentationOverrides(nextOverrides)
    if (!normalized[normalizedId]) return false
    settings.appearance.entryPresentationOverrides = normalized
    return true
  }

  const clearEntryPresentationOverride = (entryId) => {
    const normalizedId = normalizeEntryOverrideId(entryId)
    if (!normalizedId) return false
    const nextOverrides = { ...(settings.appearance.entryPresentationOverrides || {}) }
    const existed = Boolean(nextOverrides[normalizedId])
    delete nextOverrides[normalizedId]
    settings.appearance.entryPresentationOverrides = normalizeEntryPresentationOverrides(nextOverrides)
    return existed
  }

  const setAppStoreMiniAppInstalled = (entryId, installed = true) => {
    const current = normalizeAppStoreMiniAppPlacements(settings.appearance.appStoreMiniAppPlacements)
    const next = setMiniAppEntryInstalled(current, entryId, installed)
    settings.appearance.appStoreMiniAppPlacements = next
    return next
  }

  const exportAppearancePack = (options = {}) =>
    buildAppearancePack(settings.appearance, {
      name: options.name,
      description: options.description,
      exportedAt: options.exportedAt,
    })

  const importAppearancePack = (payload = {}) => {
    const result = mergeAppearancePackIntoAppearance(settings.appearance, payload)
    if (!result.ok) return result

    const appearance = result.appearance
    settings.appearance.currentTheme = normalizeThemeId(appearance.currentTheme)
    settings.appearance.wallpaperMode = normalizeWallpaperMode(appearance.wallpaperMode)
    settings.appearance.wallpaperAssetId = normalizeWallpaperAssetId(appearance.wallpaperAssetId)
    settings.appearance.wallpaper =
      typeof appearance.wallpaper === 'string' ? appearance.wallpaper : getThemeWallpaper(settings.appearance.currentTheme)
    settings.appearance.showStatusBar = appearance.showStatusBar !== false
    settings.appearance.hapticFeedbackEnabled = appearance.hapticFeedbackEnabled !== false
    settings.appearance.customCss = typeof appearance.customCss === 'string' ? appearance.customCss : ''
    settings.appearance.scopedCustomCss = normalizeScopedCustomCss(appearance.scopedCustomCss)
    settings.appearance.appSkins = normalizeAppSkinSettings(appearance.appSkins)
    settings.appearance.customVars =
      appearance.customVars && typeof appearance.customVars === 'object' ? { ...appearance.customVars } : {}
    settings.appearance.appIconOverrides = normalizeAppIconOverrides(appearance.appIconOverrides)
    settings.appearance.entryPresentationOverrides = normalizeEntryPresentationOverrides(
      appearance.entryPresentationOverrides,
    )
    settings.appearance.appStoreMiniAppPlacements = normalizeAppStoreMiniAppPlacements(
      appearance.appStoreMiniAppPlacements || settings.appearance.appStoreMiniAppPlacements,
    )
    settings.appearance.lockClockStyle = normalizeLockClockStyle(appearance.lockClockStyle)

    return {
      ok: true,
      reason: 'imported',
      pack: result.pack,
      appearance: {
        ...settings.appearance,
        scopedCustomCss: normalizeScopedCustomCss(settings.appearance.scopedCustomCss),
        appSkins: normalizeAppSkinSettings(settings.appearance.appSkins),
        appIconOverrides: normalizeAppIconOverrides(settings.appearance.appIconOverrides),
        entryPresentationOverrides: normalizeEntryPresentationOverrides(
          settings.appearance.entryPresentationOverrides,
        ),
        appStoreMiniAppPlacements: normalizeAppStoreMiniAppPlacements(
          settings.appearance.appStoreMiniAppPlacements,
        ),
      },
    }
  }

  const setChatAppearance = (updates = {}) => {
    const current = normalizeChatAppearance(settings.appearance.chat)
    const next = normalizeChatAppearance({
      ...current,
      ...(updates && typeof updates === 'object' ? updates : {}),
    })
    const changed = JSON.stringify(current) !== JSON.stringify(next)
    settings.appearance.chat = next
    return changed
  }

  const setCustomVar = (variableName, variableValue) => {
    if (!variableName) return
    settings.appearance.customVars = {
      ...settings.appearance.customVars,
      [variableName]: variableValue,
    }
  }

  const removeCustomVar = (variableName) => {
    if (!variableName || !settings.appearance.customVars[variableName]) return
    const nextVars = { ...settings.appearance.customVars }
    delete nextVars[variableName]
    settings.appearance.customVars = nextVars
  }

  const setHomeWidgetPages = (pages) => {
    settings.appearance.homeWidgetPages = normalizeHomeWidgetPagesForCurrentSettings(pages)
    settings.appearance.homeLayoutTemplateIds = normalizeHomeLayoutTemplateIdsForCurrentPages(
      settings.appearance.homeLayoutTemplateIds,
    )
    normalizeCurrentHomeLayoutSlotPlacements()
  }

  const resetHomeWidgetPages = () => {
    settings.appearance.homeWidgetPages = normalizeHomeWidgetPagesForCurrentSettings(
      cloneDefaultWidgetPages(),
    )
    settings.appearance.homeLayoutTemplateIds = cloneDefaultHomeLayoutTemplateIds()
    settings.appearance.homeDesktopSetupVersion = HOME_DESKTOP_SETUP_VERSION
    syncHomeLayoutSlotPlacementsFromPages()
  }

  const migrateHomeDesktopLayoutAfterHydration = (persistedSetupVersion = HOME_DESKTOP_SETUP_VERSION) => {
    const hasOutdatedSetupVersion =
      normalizeHomeDesktopSetupVersion(persistedSetupVersion) < HOME_DESKTOP_SETUP_VERSION
    const shouldResetToCleanSetup =
      areHomeTilePagesEqual(settings.appearance.homeWidgetPages, LEGACY_DEFAULT_WIDGET_PAGES) ||
      isLegacyCrowdedHomeDesktopSetup(settings.appearance.homeWidgetPages)

    if (shouldResetToCleanSetup) {
      resetHomeWidgetPages()
      return
    }

    keepOnlyExplicitlyPlacedHomeTilesOnPages()
    if (hasOutdatedSetupVersion) {
      settings.appearance.homeDesktopSetupVersion = HOME_DESKTOP_SETUP_VERSION
    }
  }

  const recommendHomeDesktopRefresh = computed(() => {
    if (isLegacyCrowdedHomeDesktopSetup(settings.appearance.homeWidgetPages)) return true
    return normalizeHomeDesktopSetupVersion(settings.appearance.homeDesktopSetupVersion) < HOME_DESKTOP_SETUP_VERSION
  })

  const applyCurrentHomeDesktopDefaults = () => {
    resetHomeWidgetPages()
    return {
      ok: true,
      homeDesktopSetupVersion: settings.appearance.homeDesktopSetupVersion,
      pageCount: settings.appearance.homeWidgetPages.length,
    }
  }

  const setHomeLayoutTemplate = (pageIndex, templateId) => {
    const normalizedPageIndex = Number.isInteger(pageIndex) ? Math.max(0, pageIndex) : 0
    const pageCount = Math.max(
      MIN_HOME_PAGES,
      settings.appearance.homeWidgetPages.length,
      normalizedPageIndex + 1,
    )
    const nextTemplateIds = normalizeHomeLayoutTemplateIds(
      settings.appearance.homeLayoutTemplateIds,
      pageCount,
    )
    nextTemplateIds[normalizedPageIndex] = normalizeHomeLayoutTemplateId(
      templateId,
      nextTemplateIds[normalizedPageIndex],
    )
    settings.appearance.homeLayoutTemplateIds = nextTemplateIds
    normalizeCurrentHomeLayoutSlotPlacements()
    keepOnlyExplicitlyPlacedHomeTilesOnPage(normalizedPageIndex)
  }

  const setHomeLayoutSlotPlacement = (pageIndex, slotId, tileId) => {
    const normalizedPageIndex = Number.isInteger(pageIndex) ? Math.max(0, pageIndex) : 0
    const normalizedSlotId = typeof slotId === 'string' ? slotId.trim() : ''
    const normalizedTileId = typeof tileId === 'string' ? tileId.trim() : ''
    if (!normalizedSlotId || !normalizedTileId) return false
    const nextTemplateIds = normalizeHomeLayoutTemplateIdsForCurrentPages(
      settings.appearance.homeLayoutTemplateIds,
    )
    const template = getHomeLayoutTemplate(nextTemplateIds[normalizedPageIndex])
    const slot = template.slots.find((item) => item.id === normalizedSlotId)
    if (!slot || !canHomeLayoutTileSizeUseSlot(homeTileSizeKey(normalizedTileId), slot)) {
      return false
    }

    const nextPages = settings.appearance.homeWidgetPages.map((page) =>
      page.filter((itemId) => itemId !== normalizedTileId),
    )
    while (nextPages.length <= normalizedPageIndex) {
      nextPages.push([])
    }
    if (!nextPages[normalizedPageIndex].includes(normalizedTileId)) {
      nextPages[normalizedPageIndex].push(normalizedTileId)
    }

    settings.appearance.homeWidgetPages = normalizeHomeWidgetPagesForCurrentSettings(nextPages)
    settings.appearance.homeLayoutTemplateIds = nextTemplateIds

    const nextPlacements = settings.appearance.homeLayoutSlotPlacements.map((page) =>
      Array.isArray(page)
        ? page.filter(
            (placement) =>
              placement?.slotId !== normalizedSlotId && placement?.tileId !== normalizedTileId,
          )
        : [],
    )
    while (nextPlacements.length <= normalizedPageIndex) {
      nextPlacements.push([])
    }
    nextPlacements[normalizedPageIndex].push({
      slotId: normalizedSlotId,
      tileId: normalizedTileId,
    })
    settings.appearance.homeLayoutSlotPlacements = normalizeHomeLayoutSlotPlacementsForCurrentSettings(
      nextPlacements,
    )
    return settings.appearance.homeWidgetPages[normalizedPageIndex]?.includes(normalizedTileId) === true
  }

  const clearHomeLayoutSlotPlacement = (pageIndex, slotId) => {
    const normalizedPageIndex = Number.isInteger(pageIndex) ? Math.max(0, pageIndex) : 0
    const normalizedSlotId = typeof slotId === 'string' ? slotId.trim() : ''
    if (!normalizedSlotId) return false
    const currentPage = settings.appearance.homeLayoutSlotPlacements[normalizedPageIndex]
    if (!Array.isArray(currentPage)) return false
    const nextPage = currentPage.filter((placement) => placement?.slotId !== normalizedSlotId)
    if (nextPage.length === currentPage.length) return false
    const nextPlacements = settings.appearance.homeLayoutSlotPlacements.map((page, index) =>
      index === normalizedPageIndex ? nextPage : Array.isArray(page) ? [...page] : [],
    )
    settings.appearance.homeLayoutSlotPlacements = normalizeHomeLayoutSlotPlacementsForCurrentSettings(
      nextPlacements,
    )
    return true
  }

  const addCustomWidget = ({
    name,
    size,
    code,
    action = DEFAULT_CUSTOM_WIDGET_ACTION,
    pageIndex = 0,
    placeOnHome = true,
  } = {}) => {
    const widget = {
      id: createCustomWidgetId(),
      name: typeof name === 'string' && name.trim() ? name.trim() : '自定义组件',
      size: normalizeCustomWidgetSize(size),
      code: typeof code === 'string' ? code : '',
      action: normalizeCustomWidgetAction(action),
      createdAt: Date.now(),
    }

    settings.appearance.customWidgets = [...settings.appearance.customWidgets, widget]

    if (placeOnHome === false || pageIndex === null) {
      settings.appearance.homeWidgetPages = normalizeHomeWidgetPagesForCurrentSettings(
        settings.appearance.homeWidgetPages,
        currentCustomWidgetIds(),
      )
      normalizeCurrentHomeLayoutSlotPlacements()
      return widget.id
    }

    const nextPages = settings.appearance.homeWidgetPages.map((page) => [...page])
    const targetPage = Number.isInteger(pageIndex) ? Math.max(0, pageIndex) : 0

    while (nextPages.length <= targetPage) {
      nextPages.push([])
    }

    nextPages[targetPage].push(widget.id)
    settings.appearance.homeWidgetPages = normalizeHomeWidgetPagesForCurrentSettings(nextPages)
    normalizeCurrentHomeLayoutSlotPlacements()

    return widget.id
  }

  const updateCustomWidget = (widgetId, updates = {}) => {
    const index = settings.appearance.customWidgets.findIndex((item) => item.id === widgetId)
    if (index < 0) return false

    const current = settings.appearance.customWidgets[index]
    const next = {
      ...current,
      name:
        typeof updates.name === 'string' && updates.name.trim()
          ? updates.name.trim()
          : current.name,
      size: updates.size ? normalizeCustomWidgetSize(updates.size) : current.size,
      code: typeof updates.code === 'string' ? updates.code : current.code,
      action:
        updates.action && typeof updates.action === 'object'
          ? normalizeCustomWidgetAction(updates.action)
          : normalizeCustomWidgetAction(current.action),
    }

    const nextWidgets = settings.appearance.customWidgets.map((item, idx) => (idx === index ? next : item))
    settings.appearance.customWidgets = nextWidgets
    settings.appearance.homeWidgetPages = normalizeHomeWidgetPagesForCurrentSettings(
      settings.appearance.homeWidgetPages,
      currentCustomWidgetIds(),
    )
    normalizeCurrentHomeLayoutSlotPlacements()
    return true
  }

  const removeCustomWidget = (widgetId) => {
    const nextWidgets = settings.appearance.customWidgets.filter((item) => item.id !== widgetId)
    settings.appearance.customWidgets = nextWidgets

    const nextPages = settings.appearance.homeWidgetPages.map((page) =>
      page.filter((tileId) => tileId !== widgetId),
    )
    settings.appearance.homeWidgetPages = normalizeHomeWidgetPagesForCurrentSettings(nextPages)
    normalizeCurrentHomeLayoutSlotPlacements()
  }

  const placeCustomWidget = (widgetId, pageIndex = 0) => {
    const exists = settings.appearance.customWidgets.some((item) => item.id === widgetId)
    if (!exists) return

    const nextPages = settings.appearance.homeWidgetPages.map((page) =>
      page.filter((tileId) => tileId !== widgetId),
    )

    const targetPage = Number.isInteger(pageIndex) ? Math.max(0, pageIndex) : 0
    while (nextPages.length <= targetPage) {
      nextPages.push([])
    }

    nextPages[targetPage].push(widgetId)
    settings.appearance.homeWidgetPages = normalizeHomeWidgetPagesForCurrentSettings(nextPages)
    normalizeCurrentHomeLayoutSlotPlacements()
  }

  const importCustomWidgets = (importPayload, pageIndex = 0, options = {}) => {
    const { placeOnHome = true, ...validationOptions } = options || {}
    const validation = validateWidgetImportPayload(importPayload, {
      fallbackName: '自定义组件',
      ...validationOptions,
    })

    if (!validation.ok) {
      return {
        ok: false,
        importedCount: 0,
        importedIds: [],
        errors: validation.errors || [],
        warnings: validation.warnings || [],
      }
    }

    const currentWidgetsSnapshot = settings.appearance.customWidgets.map((widget) => ({ ...widget }))
    const currentPagesSnapshot = settings.appearance.homeWidgetPages.map((page) => [...page])
    const currentPlacementsSnapshot = settings.appearance.homeLayoutSlotPlacements.map((page) =>
      Array.isArray(page) ? page.map((placement) => ({ ...placement })) : [],
    )

    try {
      const now = Date.now()
      const importedWidgets = validation.items.map((item, index) => ({
        id: `${CUSTOM_WIDGET_ID_PREFIX}${now + index}_${Math.random().toString(36).slice(2, 8)}`,
        name: item.name,
        size: normalizeCustomWidgetSize(item.size),
        code: item.code,
        action: { ...DEFAULT_CUSTOM_WIDGET_ACTION },
        createdAt: now + index,
      }))

      const mergedWidgets = [...currentWidgetsSnapshot, ...importedWidgets]
      const nextPages = currentPagesSnapshot.map((page) => [...page])
      const shouldPlaceOnHome = placeOnHome !== false && pageIndex !== null

      if (shouldPlaceOnHome) {
        const targetPage = Number.isInteger(pageIndex) ? Math.max(0, pageIndex) : 0
        while (nextPages.length <= targetPage) {
          nextPages.push([])
        }
        importedWidgets.forEach((widget) => {
          nextPages[targetPage].push(widget.id)
        })
      }

      const mergedWidgetIds = mergedWidgets.map((widget) => widget.id)
      const normalizedPages = normalizeHomeWidgetPagesForCurrentSettings(nextPages, mergedWidgetIds)

      settings.appearance.customWidgets = mergedWidgets
      settings.appearance.homeWidgetPages = normalizedPages
      normalizeCurrentHomeLayoutSlotPlacements()

      return {
        ok: true,
        importedCount: importedWidgets.length,
        importedIds: importedWidgets.map((widget) => widget.id),
        errors: [],
        warnings: validation.warnings || [],
      }
    } catch {
      settings.appearance.customWidgets = currentWidgetsSnapshot
      settings.appearance.homeWidgetPages = currentPagesSnapshot
      settings.appearance.homeLayoutSlotPlacements = currentPlacementsSnapshot
      return {
        ok: false,
        importedCount: 0,
        importedIds: [],
        errors: [{ index: -1, code: 'ROLLBACK_FAILED' }],
        warnings: validation.warnings || [],
      }
    }
  }

  const placeBuiltInWidgetTile = (tileId, pageIndex = 0) => {
    if (!BUILT_IN_WIDGET_TILE_IDS.includes(tileId)) return false

    const nextPages = settings.appearance.homeWidgetPages.map((page) =>
      page.filter((itemId) => itemId !== tileId),
    )

    const targetPage = Number.isInteger(pageIndex) ? Math.max(0, pageIndex) : 0
    while (nextPages.length <= targetPage) {
      nextPages.push([])
    }

    nextPages[targetPage].push(tileId)
    settings.appearance.homeWidgetPages = normalizeHomeWidgetPagesForCurrentSettings(nextPages)
    normalizeCurrentHomeLayoutSlotPlacements()
    return true
  }

  const restoreHomeTileByDefaultOrder = (tileId) => {
    if (!CORE_HOME_TILE_IDS.includes(tileId)) return false
    if (
      OPTIONAL_HOME_TILE_IDS.has(tileId) &&
      !currentEnabledOptionalHomeTileIds().includes(tileId)
    ) {
      return false
    }
    const targetPage = DEFAULT_TILE_PAGE_INDEX[tileId]
    if (!Number.isInteger(targetPage)) return false

    const nextPages = settings.appearance.homeWidgetPages.map((page) =>
      page.filter((itemId) => itemId !== tileId),
    )

    while (nextPages.length <= targetPage) {
      nextPages.push([])
    }

    nextPages[targetPage] = insertHomeTileByDefaultOrder(nextPages[targetPage], tileId, targetPage)
    settings.appearance.homeWidgetPages = normalizeHomeWidgetPagesForCurrentSettings(nextPages)
    normalizeCurrentHomeLayoutSlotPlacements()
    return true
  }

  const restoreBuiltInWidgetTile = (tileId) => {
    if (!BUILT_IN_WIDGET_TILE_IDS.includes(tileId)) return false
    return restoreHomeTileByDefaultOrder(tileId)
  }

  const addNotification = (rawNote = {}) => {
    if (settings.system.notifications === false) return ''

    const normalized = normalizeNotification({
      ...rawNote,
      id: createNotificationId(),
      createdAt:
        typeof rawNote.createdAt === 'number' && Number.isFinite(rawNote.createdAt)
          ? rawNote.createdAt
          : Date.now(),
      read: false,
    })
    if (!normalized) return ''

    notifications.value = [normalized, ...notifications.value].slice(0, MAX_NOTIFICATIONS)
    void dispatchNotificationToRealPush(normalized)
    return normalized.id
  }

  const markNotificationRead = (notificationId) => {
    if (!notificationId) return false
    const index = notifications.value.findIndex((item) => item.id === notificationId)
    if (index < 0) return false
    if (notifications.value[index].read) return true
    notifications.value = notifications.value.map((item, idx) =>
      idx === index
        ? {
            ...item,
            read: true,
          }
        : item,
    )
    return true
  }

  const markAllNotificationsRead = () => {
    notifications.value = notifications.value.map((item) => ({
      ...item,
      read: true,
    }))
  }

  const removeNotification = (notificationId) => {
    notifications.value = notifications.value.filter((item) => item.id !== notificationId)
  }

  const clearNotifications = () => {
    notifications.value = []
  }

  const setGlobalWorldview = (value = '') => {
    const normalized = normalizeWorldText(value, '')
    user.globalWorldview = normalized
    user.worldBook = normalized
    return normalized
  }

  const getEncyclopediaEntryById = (entryId) => {
    const id = sanitizeEncyclopediaEntryId(entryId)
    if (!id) return null
    return user.encyclopediaEntries.find((item) => item.id === id) || null
  }

  const listEncyclopediaEntries = (options = {}) => {
    const enabledOnly = Boolean(options.enabledOnly)
    const keywordRaw = typeof options.keyword === 'string' ? options.keyword.trim().toLowerCase() : ''
    return user.encyclopediaEntries.filter((item) => {
      if (enabledOnly && item.enabled === false) return false
      if (!keywordRaw) return true
      const haystack = `${item.title || ''}\n${item.content || ''}\n${Array.isArray(item.tags) ? item.tags.join(' ') : ''}`.toLowerCase()
      return haystack.includes(keywordRaw)
    })
  }

  const findRelevantEncyclopediaEntries = (options = {}) => {
    const enabledOnly = options.enabledOnly !== false
    const limit = clamp(toInt(options.limit, 3), 1, 8)
    const matchContext = buildEncyclopediaEntryMatchContext(options)
    if (
      matchContext.tokens.length === 0 &&
      matchContext.phrases.length === 0 &&
      matchContext.tags.length === 0
    ) {
      return []
    }

    return listEncyclopediaEntries({ enabledOnly })
      .map((item) => {
        const title = normalizeKnowledgePointMatchValue(item.title, MAX_KNOWLEDGE_POINT_TITLE_CHARS)
        const content = normalizeKnowledgePointMatchValue(
          item.content,
          MAX_KNOWLEDGE_POINT_CONTENT_CHARS,
        )
        const tags = normalizeEncyclopediaEntryTags(item.tags).map((tag) => tag.toLowerCase())
        let score = 0
        let tagHits = 0
        let titleHits = 0
        let contentHits = 0
        let phraseHits = 0

        matchContext.tags.forEach((term) => {
          if (tags.includes(term)) {
            score += 8
            tagHits += 1
          }
        })
        matchContext.tokens.forEach((term) => {
          if (tags.includes(term)) score += 5
          if (title.includes(term)) {
            score += term.length >= 4 ? 5 : 4
            titleHits += 1
            return
          }
          if (content.includes(term)) {
            score += term.length >= 4 ? 3 : 2
            contentHits += 1
          }
        })
        matchContext.phrases.forEach((phrase) => {
          if (title.includes(phrase)) {
            score += 6
            phraseHits += 1
            return
          }
          if (content.includes(phrase)) {
            score += 4
            phraseHits += 1
          }
        })

        const hasConfidentMatch =
          tagHits > 0 || phraseHits > 0 || titleHits + contentHits >= 2
        if (!hasConfidentMatch || score <= 0) return null
        return { item, score }
      })
      .filter(Boolean)
      .sort((a, b) => b.score - a.score || b.item.updatedAt - a.item.updatedAt)
      .slice(0, limit)
      .map(({ item }) => item)
  }

  const upsertEncyclopediaEntry = (payload = {}) => {
    const input = payload && typeof payload === 'object' ? payload : {}
    const requestedId = sanitizeEncyclopediaEntryId(input.id)
    const normalized = normalizeEncyclopediaEntry(input, user.encyclopediaEntries.length)
    if (!normalized) return null

    if (requestedId) {
      const index = user.encyclopediaEntries.findIndex((item) => item.id === requestedId)
      if (index >= 0) {
        const existing = user.encyclopediaEntries[index]
        const next = {
          ...existing,
          ...normalized,
          id: requestedId,
          createdAt: existing.createdAt,
          updatedAt: Date.now(),
        }
        user.encyclopediaEntries.splice(index, 1, next)
        user.knowledgePoints = user.encyclopediaEntries
        return next
      }
    }

    if (user.encyclopediaEntries.length >= MAX_KNOWLEDGE_POINTS) return null
    const created = {
      ...normalized,
      id: requestedId || normalized.id || createEncyclopediaEntryId(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    user.encyclopediaEntries.push(created)
    user.knowledgePoints = user.encyclopediaEntries
    return created
  }

  const setEncyclopediaEntryEnabled = (entryId, enabled) => {
    const item = getEncyclopediaEntryById(entryId)
    if (!item) return false
    item.enabled = enabled !== false
    item.updatedAt = Date.now()
    return true
  }

  const removeEncyclopediaEntry = (entryId) => {
    const id = sanitizeEncyclopediaEntryId(entryId)
    if (!id) return false
    const index = user.encyclopediaEntries.findIndex((item) => item.id === id)
    if (index < 0) return false
    user.encyclopediaEntries.splice(index, 1)
    user.knowledgePoints = user.encyclopediaEntries
    return true
  }

  const getKnowledgePointById = getEncyclopediaEntryById
  const listKnowledgePoints = listEncyclopediaEntries
  const findRelevantKnowledgePoints = findRelevantEncyclopediaEntries
  const upsertKnowledgePoint = upsertEncyclopediaEntry
  const setKnowledgePointEnabled = setEncyclopediaEntryEnabled
  const removeKnowledgePoint = removeEncyclopediaEntry

  const normalizeCurrentWorldBookSourceLinks = () => {
    user.worldBookSourceLinks = normalizeWorldBookSourceLinks(user.worldBookSourceLinks)
    return user.worldBookSourceLinks
  }

  const listWorldBookSourceLinks = () =>
    normalizeWorldBookSourceLinks(user.worldBookSourceLinks).map((link) => ({
      ...link,
      sectionIds: Array.isArray(link.sectionIds) ? [...link.sectionIds] : [],
    }))

  const addWorldBookSourceLink = (input = {}) => {
    const normalized = normalizeWorldBookSourceLink({
      ...input,
      createdAt: input.createdAt || Date.now(),
      updatedAt: input.updatedAt || Date.now(),
    }, user.worldBookSourceLinks.length)
    if (!normalized.assetId) return null
    const current = normalizeCurrentWorldBookSourceLinks()
    const existingIndex = current.findIndex(
      (link) =>
        link.assetId === normalized.assetId &&
        (link.role || link.usage) === (normalized.role || normalized.usage) &&
        JSON.stringify(link.sectionIds || []) === JSON.stringify(normalized.sectionIds || []),
    )
    if (existingIndex >= 0) {
      const next = {
        ...current[existingIndex],
        ...normalized,
        id: current[existingIndex].id,
        createdAt: current[existingIndex].createdAt,
        updatedAt: Date.now(),
      }
      user.worldBookSourceLinks.splice(existingIndex, 1, next)
      normalizeCurrentWorldBookSourceLinks()
      return { ...next, sectionIds: [...next.sectionIds] }
    }
    user.worldBookSourceLinks.push(normalized)
    normalizeCurrentWorldBookSourceLinks()
    return { ...normalized, sectionIds: [...normalized.sectionIds] }
  }

  const updateWorldBookSourceLink = (linkId, patch = {}) => {
    const id = typeof linkId === 'string' ? linkId.trim() : ''
    if (!id) return null
    const current = normalizeCurrentWorldBookSourceLinks()
    const index = current.findIndex((link) => link.id === id)
    if (index < 0) return null
    const next = normalizeWorldBookSourceLink({
      ...current[index],
      ...patch,
      id,
      createdAt: current[index].createdAt,
      updatedAt: Date.now(),
    }, index)
    if (!next.assetId) return null
    user.worldBookSourceLinks.splice(index, 1, next)
    normalizeCurrentWorldBookSourceLinks()
    return { ...next, sectionIds: [...next.sectionIds] }
  }

  const removeWorldBookSourceLink = (linkId) => {
    const id = typeof linkId === 'string' ? linkId.trim() : ''
    if (!id) return false
    const before = user.worldBookSourceLinks.length
    user.worldBookSourceLinks = normalizeCurrentWorldBookSourceLinks().filter((link) => link.id !== id)
    return user.worldBookSourceLinks.length !== before
  }

  const normalizeCurrentWorldPacks = () => {
    user.worldPacks = normalizeWorldPacks(user.worldPacks)
    if (!user.worldPacks.some((pack) => pack.id === user.activeWorldPackId)) {
      user.activeWorldPackId = DEFAULT_WORLD_PACK_ID
    }
    user.worldPackActivation = normalizeWorldPackActivation(user.worldPackActivation, user.activeWorldPackId)
    return user.worldPacks
  }

  const listWorldPacks = () =>
    normalizeWorldPacks(user.worldPacks).map((pack) => ({
      ...pack,
      encyclopediaEntryIds: Array.isArray(pack.encyclopediaEntryIds)
        ? [...pack.encyclopediaEntryIds]
        : Array.isArray(pack.knowledgePointIds)
          ? [...pack.knowledgePointIds]
          : [],
      knowledgePointIds: Array.isArray(pack.encyclopediaEntryIds)
        ? [...pack.encyclopediaEntryIds]
        : Array.isArray(pack.knowledgePointIds)
          ? [...pack.knowledgePointIds]
          : [],
      profileTemplateIds: Array.isArray(pack.profileTemplateIds) ? [...pack.profileTemplateIds] : [],
      bookSourceLinkIds: Array.isArray(pack.bookSourceLinkIds) ? [...pack.bookSourceLinkIds] : [],
      relationshipCategories: Array.isArray(pack.relationshipCategories)
        ? pack.relationshipCategories.map((item) => ({ ...item }))
        : [],
      relationshipModifiers: Array.isArray(pack.relationshipModifiers)
        ? pack.relationshipModifiers.map((item) => ({ ...item }))
        : [],
      appBindings: Array.isArray(pack.appBindings) ? pack.appBindings.map((binding) => ({ ...binding })) : [],
      serviceAccountTemplates: Array.isArray(pack.serviceAccountTemplates)
        ? pack.serviceAccountTemplates.map((template) => ({ ...template }))
        : [],
      terminology: pack.terminology && typeof pack.terminology === 'object' ? { ...pack.terminology } : {},
      economy: pack.economy && typeof pack.economy === 'object'
        ? {
            ...pack.economy,
            currencies: Array.isArray(pack.economy.currencies)
              ? pack.economy.currencies.map((currency) => ({ ...currency }))
              : [],
          }
        : { currencies: [] },
    }))

  const getWorldPackById = (packId = '') => {
    const id = typeof packId === 'string' && packId.trim() ? packId.trim() : DEFAULT_WORLD_PACK_ID
    return listWorldPacks().find((pack) => pack.id === id) || listWorldPacks()[0] || null
  }

  const getActiveWorldPack = () => getWorldPackById(user.activeWorldPackId || DEFAULT_WORLD_PACK_ID)

  const setWorldProfileAnalysis = (profile = {}) => {
    user.worldProfileAnalysis = normalizeWorldProfile({
      ...profile,
      analyzedAt: Date.now(),
    })
    return { ...user.worldProfileAnalysis }
  }

  const listEnabledWorldPacks = () => {
    const ids = normalizeWorldPackIdList(user.enabledWorldPackIds)
    if (ids.length === 0 && user.activeWorldPackId) {
      return [getWorldPackById(user.activeWorldPackId)].filter(Boolean)
    }
    return ids.map((id) => getWorldPackById(id)).filter(Boolean)
  }

  const buildWorldPackRecommendationReview = () => {
    const worldProfile = normalizeWorldProfile(user.worldProfileAnalysis)
    const reviews = listWorldPacks()
      .filter((pack) => pack.id !== DEFAULT_WORLD_PACK_ID)
      .map((pack) => buildWorldPackCompatibilityReview({ pack, worldProfile }))
    return {
      worldProfile,
      reviews,
      grouped: groupWorldPackRecommendations(reviews),
    }
  }

  const buildWorldPackActivationReview = (packId = '') => {
    const pack = getWorldPackById(packId)
    if (!pack) return null
    return buildWorldPackActivationReviewPayload({
      pack,
      encyclopediaEntries: listEncyclopediaEntries({ enabledOnly: false }),
      knowledgePoints: listKnowledgePoints({ enabledOnly: false }),
      profileTemplates: listProfileTemplates(),
      bookSourceLinks: listWorldBookSourceLinks(),
    })
  }

  const buildWorldPackEnablementReview = (packId = '') => {
    const activationReview = buildWorldPackActivationReview(packId)
    const pack = getWorldPackById(packId)
    const recommendation = buildWorldPackCompatibilityReview({
      pack: pack || {},
      worldProfile: user.worldProfileAnalysis,
    })
    return {
      packId: pack?.id || packId,
      blocked: Boolean(activationReview?.blocked) || !recommendation.enableable,
      activationReview,
      recommendation,
    }
  }

  const enableWorldPack = (packId = '') => {
    const pack = getWorldPackById(packId)
    if (!pack) return { ok: false, reason: 'not_found', pack: null, review: null }
    const review = buildWorldPackEnablementReview(pack.id)
    if (review.blocked) {
      return {
        ok: false,
        reason: review.recommendation?.enableable === false ? 'unsupported' : 'blocked',
        pack,
        review,
      }
    }
    const ids = normalizeWorldPackIdList(user.enabledWorldPackIds)
    if (!ids.includes(pack.id)) ids.push(pack.id)
    user.enabledWorldPackIds = ids
    user.worldPackEnablements = normalizeWorldPackEnablements({
      ...user.worldPackEnablements,
      [pack.id]: {
        packId: pack.id,
        enabledAt: Date.now(),
        fitStatus: review.recommendation.fitStatus,
        reviewSnapshot: {
          summary: { ...(review.activationReview?.summary || {}) },
          effectRows: Array.isArray(review.activationReview?.effectRows)
            ? review.activationReview.effectRows.map((row) => ({ ...row }))
            : [],
          recommendation: {
            fitStatus: review.recommendation.fitStatus,
            reasons: [...(review.recommendation.reasons || [])],
          },
        },
      },
    })
    normalizeCurrentHomeWidgetPages()
    return { ok: true, reason: 'enabled', pack, review }
  }

  const disableWorldPack = (packId = '') => {
    const id = typeof packId === 'string' ? packId.trim() : ''
    if (!id) return { ok: false, reason: 'not_found' }
    const before = normalizeWorldPackIdList(user.enabledWorldPackIds)
    user.enabledWorldPackIds = before.filter((item) => item !== id)
    const nextEnablements = { ...normalizeWorldPackEnablements(user.worldPackEnablements) }
    delete nextEnablements[id]
    user.worldPackEnablements = nextEnablements
    normalizeCurrentHomeWidgetPages()
    return { ok: before.includes(id), reason: before.includes(id) ? 'disabled' : 'not_enabled' }
  }

  const activateWorldPack = (packId = '') => {
    const review = buildWorldPackActivationReview(packId)
    if (!review || review.blocked) {
      return { ok: false, reason: 'blocked', review }
    }
    const pack = getWorldPackById(packId)
    if (!pack) return { ok: false, reason: 'not_found', review: null }
    user.activeWorldPackId = pack.id
    user.enabledWorldPackIds = pack.id === DEFAULT_WORLD_PACK_ID ? [] : [pack.id]
    user.worldPackEnablements = pack.id === DEFAULT_WORLD_PACK_ID
      ? {}
      : normalizeWorldPackEnablements({
          [pack.id]: {
            packId: pack.id,
            enabledAt: Date.now(),
            fitStatus: 'recommended',
            reviewSnapshot: {
              summary: { ...review.summary },
              effectRows: review.effectRows.map((row) => ({ ...row })),
            },
          },
        })
    user.worldPackActivation = normalizeWorldPackActivation({
      activePackId: pack.id,
      state: 'active',
      reviewedAt: Date.now(),
      activatedAt: Date.now(),
      reviewSnapshot: {
        packId: review.packId,
        summary: { ...review.summary },
        effectRows: review.effectRows.map((row) => ({ ...row })),
      },
    }, pack.id)
    user.worldPacks = normalizeWorldPacks(
      user.worldPacks.map((item) => ({
        ...item,
        state: item.id === pack.id ? 'active' : 'available',
      })),
    )
    normalizeCurrentHomeWidgetPages()
    return { ok: true, pack: getActiveWorldPack(), review }
  }

  const upsertWorldPack = (packInput = {}) => {
    const normalized = normalizeWorldPack({
      ...packInput,
      updatedAt: Date.now(),
    }, user.worldPacks.length)
    const current = normalizeCurrentWorldPacks()
    const index = current.findIndex((pack) => pack.id === normalized.id)
    if (index >= 0) {
      current.splice(index, 1, {
        ...current[index],
        ...normalized,
        createdAt: current[index].createdAt,
        updatedAt: Date.now(),
      })
    } else {
      current.push({
        ...normalized,
        createdAt: normalized.createdAt || Date.now(),
        updatedAt: Date.now(),
      })
    }
    user.worldPacks = normalizeWorldPacks(current)
    return getWorldPackById(normalized.id)
  }

  const updateWorldPackEconomy = (packId = '', economyPatch = {}) => {
    const pack = getWorldPackById(packId)
    if (!pack) return { ok: false, reason: 'pack_not_found', pack: null }
    const nextPack = upsertWorldPack({
      ...pack,
      economy: {
        ...(pack.economy || {}),
        ...(economyPatch && typeof economyPatch === 'object' ? economyPatch : {}),
      },
    })
    return { ok: true, reason: 'updated', pack: nextPack }
  }

  const updateWorldServiceAccountTemplate = (packId = '', templateId = '', patch = {}) => {
    const pack = getWorldPackById(packId)
    if (!pack) return { ok: false, reason: 'pack_not_found', pack: null, template: null }
    const id = typeof templateId === 'string' ? templateId.trim() : ''
    if (!id) return { ok: false, reason: 'template_not_found', pack, template: null }
    const templates = Array.isArray(pack.serviceAccountTemplates) ? pack.serviceAccountTemplates : []
    const index = templates.findIndex((template) => template?.id === id)
    if (index < 0) return { ok: false, reason: 'template_not_found', pack, template: null }

    const currentTemplate = templates[index]
    const nextTemplate = normalizeWorldServiceAccountTemplate({
      ...currentTemplate,
      ...patch,
      id: currentTemplate.id,
      userEditedAt: Date.now(),
    }, index)
    const nextTemplates = templates.map((template, templateIndex) =>
      templateIndex === index ? nextTemplate : template,
    )
    const nextPack = upsertWorldPack({
      ...pack,
      serviceAccountTemplates: nextTemplates,
    })
    return { ok: true, reason: 'updated', pack: nextPack, template: nextTemplate }
  }

  const resetWorldServiceAccountTemplate = (packId = '', templateId = '') => {
    const pack = getWorldPackById(packId)
    if (!pack) return { ok: false, reason: 'pack_not_found', pack: null, template: null }
    const id = typeof templateId === 'string' ? templateId.trim() : ''
    if (!id) return { ok: false, reason: 'template_not_found', pack, template: null }
    const templates = Array.isArray(pack.serviceAccountTemplates) ? pack.serviceAccountTemplates : []
    const index = templates.findIndex((template) => template?.id === id)
    if (index < 0) return { ok: false, reason: 'template_not_found', pack, template: null }

    const builtInPack = BUILT_IN_WORLD_PACKS.find((item) => item?.id === pack.id)
    const builtInTemplate = builtInPack?.serviceAccountTemplates?.find((template) => template?.id === id)
    if (!builtInTemplate) return { ok: false, reason: 'built_in_template_not_found', pack, template: null }

    const nextTemplate = normalizeWorldServiceAccountTemplate(builtInTemplate, index)
    const nextTemplates = templates.map((template, templateIndex) =>
      templateIndex === index ? nextTemplate : template,
    )
    const nextPack = upsertWorldPack({
      ...pack,
      serviceAccountTemplates: nextTemplates,
    })
    return { ok: true, reason: 'reset', pack: nextPack, template: nextTemplate }
  }

  const listWorldAppTemplates = () => listWorldAppTemplateRegistry()

  const buildWorldAppTemplateExtractionReview = (input = [], packId = user.activeWorldPackId) => {
    const pack = getWorldPackById(packId)
    const reviewInput = Array.isArray(input)
      ? { proposals: input }
      : input && typeof input === 'object'
        ? { payload: input }
        : { proposals: [] }
    return buildWorldAppTemplateExtractionReviewPayload({
      ...reviewInput,
      worldPackId: pack?.id || packId || '',
      existingBindings: pack?.appBindings || [],
    })
  }

  const confirmWorldAppTemplateProposal = (proposal = {}, packId = user.activeWorldPackId) => {
    const pack = getWorldPackById(packId)
    if (!pack) return { ok: false, reason: 'pack_not_found', binding: null, pack: null }
    const review = buildWorldAppTemplateExtractionReview([proposal], pack.id)
    const confirmable = review.confirmableProposals[0]
    if (!confirmable) {
      return {
        ok: false,
        reason: review.rejectedProposals[0]?.rejectionReason || 'not_confirmable',
        binding: null,
        pack,
        review,
      }
    }
    const binding = buildWorldAppBindingFromTemplateProposal(confirmable)
    if (!binding) {
      return { ok: false, reason: 'binding_failed', binding: null, pack, review }
    }
    const nextPack = upsertWorldPack({
      ...pack,
      appBindings: [...(Array.isArray(pack.appBindings) ? pack.appBindings : []), binding],
    })
    return {
      ok: true,
      reason: 'confirmed',
      binding,
      pack: nextPack,
      review,
    }
  }

  const buildWorldServiceTemplateProposalReview = (input = [], packId = user.activeWorldPackId) => {
    const pack = getWorldPackById(packId)
    const reviewInput = Array.isArray(input)
      ? { proposals: input }
      : input && typeof input === 'object'
        ? { payload: input }
        : { proposals: [] }
    return buildWorldServiceTemplateProposalReviewPayload({
      ...reviewInput,
      worldPack: pack || {},
      worldPackId: pack?.id || packId || '',
    })
  }

  const confirmWorldServiceTemplateProposal = (proposal = {}, packId = user.activeWorldPackId) => {
    const pack = getWorldPackById(packId)
    if (!pack) return { ok: false, reason: 'pack_not_found', template: null, pack: null }
    const review = buildWorldServiceTemplateProposalReview([proposal], pack.id)
    const confirmable = review.confirmableProposals[0]
    if (!confirmable) {
      return {
        ok: false,
        reason: review.rejectedProposals[0]?.rejectionReason || 'not_confirmable',
        template: null,
        pack,
        review,
      }
    }
    const template = buildWorldServiceAccountTemplateFromProposal({
      ...confirmable,
      worldPackId: pack.id,
    })
    if (!template) {
      return { ok: false, reason: 'template_failed', template: null, pack, review }
    }
    const nextPack = upsertWorldPack({
      ...pack,
      serviceAccountTemplates: [
        ...(Array.isArray(pack.serviceAccountTemplates) ? pack.serviceAccountTemplates : []),
        template,
      ],
    })
    return {
      ok: true,
      reason: 'confirmed',
      template,
      pack: nextPack,
      review,
    }
  }

  const listProfileTemplates = () => normalizeProfileTemplates(user.profileTemplates).map(cloneProfileTemplate)

  const listProfileTemplatePresets = () =>
    listProfileTemplates().filter(
      (template) => template.scope === PROFILE_TEMPLATE_SCOPES.GLOBAL_PRESET,
    )

  const listWorldProfileTemplates = (worldId = '', options = {}) => {
    const targetWorldId = typeof worldId === 'string' && worldId.trim() ? worldId.trim() : 'default_world'
    return listProfileTemplates().filter(
      (template) =>
        template.scope === PROFILE_TEMPLATE_SCOPES.WORLD &&
        template.worldId === targetWorldId &&
        (options.enabledOnly !== true || template.enabled !== false),
    )
  }

  const getProfileTemplateById = (templateId = '') => {
    const id = typeof templateId === 'string' ? templateId.trim() : ''
    if (!id) return null
    return listProfileTemplates().find((template) => template.id === id) || null
  }

  const replaceProfileTemplateList = (templates = []) => {
    user.profileTemplates = normalizeProfileTemplates(templates)
  }

  const upsertProfileTemplate = (templateInput = {}) => {
    const template = normalizeProfileTemplate(templateInput)
    const current = listProfileTemplates()
    const index = current.findIndex((item) => item.id === template.id)
    if (index >= 0) {
      current.splice(index, 1, template)
    } else {
      current.push(template)
    }
    replaceProfileTemplateList(current)
    return cloneProfileTemplate(template)
  }

  const createWorldProfileTemplateFromPreset = (presetId, options = {}) => {
    const preset = getProfileTemplateById(presetId)
    if (!preset) return null
    return upsertProfileTemplate({
      ...preset,
      id: `world_template_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      scope: PROFILE_TEMPLATE_SCOPES.WORLD,
      worldId: options.worldId || 'default_world',
      title: options.title || preset.title,
      version: 1,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })
  }

  const updateWorldProfileTemplate = (templateId, updates = {}) => {
    const existing = getProfileTemplateById(templateId)
    if (!existing || existing.scope !== PROFILE_TEMPLATE_SCOPES.WORLD) return null
    return upsertProfileTemplate({
      ...existing,
      ...updates,
      id: existing.id,
      scope: PROFILE_TEMPLATE_SCOPES.WORLD,
      worldId: updates.worldId || existing.worldId || 'default_world',
      version: Math.max(1, Number(existing.version) || 1) + 1,
      createdAt: existing.createdAt,
      updatedAt: Date.now(),
    })
  }

  const setWorldProfileTemplateEnabled = (templateId, enabled = true) => {
    const existing = getProfileTemplateById(templateId)
    if (!existing || existing.scope !== PROFILE_TEMPLATE_SCOPES.WORLD) return null
    return upsertProfileTemplate({
      ...existing,
      enabled: enabled !== false,
      updatedAt: Date.now(),
    })
  }

  const resolveChatTruthEntityMeta = (rawContact = {}) => {
    const contact = rawContact && typeof rawContact === 'object' ? rawContact : {}
    const contactId = Number(contact.id)
    const profileId = Number(contact.profileId)
    const kind =
      typeof contact.kind === 'string' && contact.kind.trim()
        ? contact.kind.trim()
        : 'role'
    const displayName =
      typeof contact.name === 'string' && contact.name.trim()
        ? contact.name.trim()
        : ''

    const entityKey =
      Number.isFinite(profileId) && profileId > 0
        ? `role:${Math.floor(profileId)}`
        : Number.isFinite(contactId) && contactId > 0
          ? `contact:${Math.floor(contactId)}`
          : ''

    if (!entityKey) return null
    return {
      entityKey,
      contactId: Number.isFinite(contactId) && contactId > 0 ? Math.floor(contactId) : 0,
      profileId: Number.isFinite(profileId) && profileId > 0 ? Math.floor(profileId) : 0,
      kind,
      displayName,
    }
  }

  const ensureChatTruthEntity = (rawContact = {}) => {
    const meta = resolveChatTruthEntityMeta(rawContact)
    if (!meta) return null

    const existing = normalizeChatTruthEntity(
      truthState.chatEntities[meta.entityKey],
      meta.entityKey,
    )
    if (existing) {
      truthState.chatEntities[meta.entityKey] = {
        ...existing,
        contactId: meta.contactId || existing.contactId,
        profileId: meta.profileId || existing.profileId,
        kind: meta.kind || existing.kind,
        displayName: meta.displayName || existing.displayName,
      }
      return truthState.chatEntities[meta.entityKey]
    }

    const now = Date.now()
    const created = normalizeChatTruthEntity({
      ...meta,
      ...DEFAULT_CHAT_TRUTH_METRICS,
      relationshipStage: DEFAULT_CHAT_TRUTH_METRICS.relationshipStage,
      createdAt: now,
      updatedAt: now,
    }, meta.entityKey)

    truthState.chatEntities[meta.entityKey] = created
    truthState.lastUpdatedAt = now
    return truthState.chatEntities[meta.entityKey]
  }

  const applyMetricDelta = (entity, key, delta = 0) => {
    const current = clampTruthMetric(entity[key], DEFAULT_CHAT_TRUTH_METRICS[key] || 0)
    entity[key] = clampTruthMetric(current + Number(delta || 0), DEFAULT_CHAT_TRUTH_METRICS[key] || 0)
  }

  const updateRelationshipStage = (entity, now) => {
    const nextStage = deriveRelationshipStage(entity)
    if (nextStage !== entity.relationshipStage) {
      entity.relationshipStage = nextStage
    }
    if (nextStage === 'warm' || nextStage === 'close') {
      entity.lastWarmMomentAt = Math.max(entity.lastWarmMomentAt || 0, now)
    }
    if (nextStage === 'strained') {
      entity.lastConflictAt = Math.max(entity.lastConflictAt || 0, now)
    }
  }

  const appendChatTruthEvent = (entityKey, action = 'interaction', payload = {}, at = Date.now()) => {
    const normalized = normalizeChatTruthEvent({
      entityKey,
      action,
      payload,
      at,
    })
    if (!normalized) return ''

    truthState.chatEvents = [normalized, ...truthState.chatEvents].slice(0, MAX_CHAT_TRUTH_EVENTS)
    truthState.lastUpdatedAt = Math.max(truthState.lastUpdatedAt || 0, normalized.at)
    return normalized.id
  }

  const touchChatTruth = (rawContact = {}, action = 'interaction', rawPayload = {}, at = Date.now()) => {
    const entity = ensureChatTruthEntity(rawContact)
    if (!entity) return null

    const now = Number.isFinite(Number(at)) ? Math.max(0, Math.floor(Number(at))) : Date.now()
    const payload = rawPayload && typeof rawPayload === 'object' ? rawPayload : {}
    const count = Math.max(1, toInt(payload.count, 1))
    const missedCycles = Math.max(1, toInt(payload.missedCycles, 1))

    if (action === 'user_message') {
      entity.userMessageCount += count
      entity.lastUserMessageAt = now
      entity.lastInteractionAt = now
      applyMetricDelta(entity, 'affinity', count)
      applyMetricDelta(entity, 'trust', count)
      applyMetricDelta(entity, 'distance', -count)
    } else if (action === 'assistant_reply') {
      entity.assistantMessageCount += count
      entity.lastAssistantMessageAt = now
      entity.lastInteractionAt = now
      applyMetricDelta(entity, 'affinity', count * 2)
      applyMetricDelta(entity, 'trust', count)
      applyMetricDelta(entity, 'distance', -(count + 1))
    } else if (action === 'manual_trigger') {
      entity.manualTriggerCount += 1
      entity.lastInteractionAt = now
    } else if (action === 'auto_trigger') {
      entity.autoTriggerCount += 1
      entity.lastInteractionAt = now
    } else if (action === 'reroll') {
      entity.rerollCount += 1
      entity.lastInteractionAt = now
      applyMetricDelta(entity, 'tension', 2)
    } else if (action === 'notify_only_skip') {
      entity.notifyOnlySkipCount += 1
      entity.lastInteractionAt = now
      applyMetricDelta(entity, 'distance', 1)
    } else if (action === 'resume_settlement') {
      entity.resumeSettlementCount += missedCycles
      entity.lastInteractionAt = now
      applyMetricDelta(entity, 'distance', Math.min(8, missedCycles))
      applyMetricDelta(entity, 'tension', Math.min(6, Math.floor(missedCycles / 2)))
    } else {
      entity.lastInteractionAt = now
    }

    updateRelationshipStage(entity, now)
    entity.updatedAt = now
    truthState.lastUpdatedAt = now

    appendChatTruthEvent(entity.entityKey, action, payload, now)
    return getChatTruthSnapshot(rawContact)
  }

  const getChatTruthSnapshot = (rawContact = {}, options = {}) => {
    const entity = ensureChatTruthEntity(rawContact)
    if (!entity) return null

    const eventLimit = clamp(toInt(options.eventLimit, 4), 0, 20)
    const recentEvents = eventLimit > 0
      ? truthState.chatEvents
          .filter((item) => item.entityKey === entity.entityKey)
          .slice(0, eventLimit)
      : []

    return {
      entityKey: entity.entityKey,
      contactId: entity.contactId,
      profileId: entity.profileId,
      kind: entity.kind,
      displayName: entity.displayName,
      relationship: {
        stage: entity.relationshipStage,
        affinity: entity.affinity,
        trust: entity.trust,
        distance: entity.distance,
        dependency: entity.dependency,
        tension: entity.tension,
      },
      timestamps: {
        lastWarmMomentAt: entity.lastWarmMomentAt,
        lastConflictAt: entity.lastConflictAt,
        lastInteractionAt: entity.lastInteractionAt,
        lastUserMessageAt: entity.lastUserMessageAt,
        lastAssistantMessageAt: entity.lastAssistantMessageAt,
      },
      counters: {
        userMessageCount: entity.userMessageCount,
        assistantMessageCount: entity.assistantMessageCount,
        manualTriggerCount: entity.manualTriggerCount,
        autoTriggerCount: entity.autoTriggerCount,
        rerollCount: entity.rerollCount,
        notifyOnlySkipCount: entity.notifyOnlySkipCount,
        resumeSettlementCount: entity.resumeSettlementCount,
      },
      recentEvents,
      updatedAt: entity.updatedAt,
    }
  }

  const clearChatTruthState = () => {
    truthState.chatEntities = {}
    truthState.chatEvents = []
    truthState.lastUpdatedAt = Date.now()
  }

  const isAiAutomationEnabledForModule = (moduleKey) => {
    const moduleConfig = settings.aiAutomation.modules?.[moduleKey]
    return Boolean(settings.aiAutomation.masterEnabled && moduleConfig?.enabled)
  }

  const isAiAutomationQuietHoursActive = (baseAt = Date.now(), options = {}) => {
    if (!settings.aiAutomation?.quietHoursEnabled) return false

    const timezone =
      typeof options?.timezone === 'string' && options.timezone.trim()
        ? options.timezone.trim()
        : settings.system.timezone

    const start = clockTimeToMinutes(
      normalizeClockTime(
        settings.aiAutomation.quietHoursStart,
        DEFAULT_AI_AUTOMATION_SETTINGS.quietHoursStart,
      ),
      0,
    )
    const end = clockTimeToMinutes(
      normalizeClockTime(
        settings.aiAutomation.quietHoursEnd,
        DEFAULT_AI_AUTOMATION_SETTINGS.quietHoursEnd,
      ),
      0,
    )

    const minute = minuteOfDayInTimeZone(baseAt, timezone)
    if (start === end) return true
    if (start < end) return minute >= start && minute < end
    return minute >= start || minute < end
  }

  const getAiAutomationRuntimePolicy = (moduleKey, baseAt = Date.now(), options = {}) => {
    const moduleConfig = settings.aiAutomation.modules?.[moduleKey]
    const masterEnabled = Boolean(settings.aiAutomation.masterEnabled)
    const moduleEnabled = Boolean(moduleConfig?.enabled)
    const enabled = Boolean(masterEnabled && moduleEnabled)
    const quietHoursActive = enabled
      ? isAiAutomationQuietHoursActive(baseAt, options)
      : false
    const notifyOnly = enabled
      ? Boolean(settings.aiAutomation.notifyOnlyMode || quietHoursActive)
      : false

    return {
      moduleKey,
      enabled,
      invokeEnabled: Boolean(enabled && !notifyOnly),
      notifyOnly,
      quietHoursActive,
      masterEnabled,
      moduleEnabled,
    }
  }

  const isAiAutomationInvokeEnabledForModule = (moduleKey, baseAt = Date.now(), options = {}) => {
    const policy = getAiAutomationRuntimePolicy(moduleKey, baseAt, options)
    return Boolean(policy.invokeEnabled)
  }

  const getAiAutomationModulePriority = (moduleKey) => {
    const moduleConfig = settings.aiAutomation.modules?.[moduleKey]
    return clamp(toInt(moduleConfig?.priority, 0), 0, 1000)
  }

  const getAiAutomationConflictCooldownMs = () => {
    const value = Number(settings.aiAutomation?.conflictCooldownSec)
    const seconds = Number.isFinite(value)
      ? Math.max(5, Math.floor(value))
      : DEFAULT_AI_AUTOMATION_SETTINGS.conflictCooldownSec
    return seconds * 1000
  }

  const getAiAutomationDedupeWindowMs = () => {
    const value = Number(settings.aiAutomation?.dedupeWindowSec)
    const seconds = Number.isFinite(value)
      ? Math.max(10, Math.floor(value))
      : DEFAULT_AI_AUTOMATION_SETTINGS.dedupeWindowSec
    return seconds * 1000
  }

  const normalizeAiAutomationTask = (rawTask = {}, fallbackAt = Date.now()) => {
    const input = rawTask && typeof rawTask === 'object' ? rawTask : {}
    const moduleKey =
      typeof input.moduleKey === 'string' && AI_AUTOMATION_MODULE_KEYS.includes(input.moduleKey)
        ? input.moduleKey
        : ''
    if (!moduleKey) return null

    const now = Number.isFinite(Number(fallbackAt))
      ? Math.max(0, Math.floor(Number(fallbackAt)))
      : Date.now()
    const dueAtRaw = Number(input.dueAt)
    const dueAt = Number.isFinite(dueAtRaw) ? Math.max(0, Math.floor(dueAtRaw)) : now
    const createdAtRaw = Number(input.createdAt)
    const createdAt = Number.isFinite(createdAtRaw) ? Math.max(0, Math.floor(createdAtRaw)) : now
    const targetId = typeof input.targetId === 'string' ? input.targetId.trim() : ''
    const source = typeof input.source === 'string' ? input.source.trim() : ''
    const reason = typeof input.reason === 'string' ? input.reason.trim() : ''
    const fingerprint = typeof input.fingerprint === 'string' ? input.fingerprint.trim() : ''
    const payload = input.payload && typeof input.payload === 'object' ? { ...input.payload } : {}
    const attemptsRaw = Number(input.attempts)
    const attempts = Number.isFinite(attemptsRaw) ? Math.max(0, Math.floor(attemptsRaw)) : 0

    return {
      id:
        typeof input.id === 'string' && input.id.trim()
          ? input.id.trim()
          : createAiAutomationTaskId(),
      moduleKey,
      targetId,
      source,
      reason,
      dueAt,
      createdAt,
      fingerprint,
      payload,
      attempts,
    }
  }

  const pruneAiAutomationFingerprints = (baseAt = Date.now()) => {
    const now = Number.isFinite(Number(baseAt)) ? Math.max(0, Math.floor(Number(baseAt))) : Date.now()
    const dedupeWindowMs = getAiAutomationDedupeWindowMs()
    const minAt = Math.max(0, now - dedupeWindowMs)
    aiAutomationRuntime.recentFingerprints = aiAutomationRuntime.recentFingerprints
      .filter((item) => {
        const at = Number(item?.at)
        const fingerprint = typeof item?.fingerprint === 'string' ? item.fingerprint.trim() : ''
        const moduleKey = typeof item?.moduleKey === 'string' ? item.moduleKey.trim() : ''
        if (!fingerprint || !moduleKey) return false
        if (!Number.isFinite(at)) return false
        return at >= minAt
      })
      .slice(0, MAX_AI_AUTOMATION_RECENT_FINGERPRINTS)
  }

  const registerAiAutomationHandler = (moduleKey, handler) => {
    if (!AI_AUTOMATION_MODULE_KEYS.includes(moduleKey)) return false
    if (typeof handler !== 'function') return false
    aiAutomationHandlers.set(moduleKey, handler)
    return true
  }

  const unregisterAiAutomationHandler = (moduleKey, handler) => {
    if (!AI_AUTOMATION_MODULE_KEYS.includes(moduleKey)) return false
    if (!aiAutomationHandlers.has(moduleKey)) return false
    if (typeof handler === 'function' && aiAutomationHandlers.get(moduleKey) !== handler) {
      return false
    }
    aiAutomationHandlers.delete(moduleKey)
    return true
  }

  const getAiAutomationQueueSnapshot = (options = {}) => {
    const baseAt = Number.isFinite(Number(options?.baseAt))
      ? Math.max(0, Math.floor(Number(options.baseAt)))
      : Date.now()
    const moduleKey =
      typeof options?.moduleKey === 'string' && AI_AUTOMATION_MODULE_KEYS.includes(options.moduleKey)
        ? options.moduleKey
        : ''
    const dueOnly = Boolean(options?.dueOnly)
    return aiAutomationQueue.value
      .filter((item) => {
        if (moduleKey && item.moduleKey !== moduleKey) return false
        if (dueOnly && item.dueAt > baseAt) return false
        return true
      })
      .map((item) => ({
        ...item,
        payload: item.payload && typeof item.payload === 'object' ? { ...item.payload } : {},
      }))
  }

  const clearAiAutomationQueue = (options = {}) => {
    const moduleKey =
      typeof options?.moduleKey === 'string' && AI_AUTOMATION_MODULE_KEYS.includes(options.moduleKey)
        ? options.moduleKey
        : ''
    const before = aiAutomationQueue.value.length
    if (!moduleKey) {
      aiAutomationQueue.value = []
      return before
    }
    aiAutomationQueue.value = aiAutomationQueue.value.filter((item) => item.moduleKey !== moduleKey)
    return Math.max(0, before - aiAutomationQueue.value.length)
  }

  const enqueueAiAutomationTask = (rawTask = {}, options = {}) => {
    const now = Number.isFinite(Number(options?.baseAt))
      ? Math.max(0, Math.floor(Number(options.baseAt)))
      : Date.now()
    const normalized = normalizeAiAutomationTask(rawTask, now)
    if (!normalized) {
      return {
        accepted: false,
        reason: 'invalid_task',
      }
    }

    const runtimePolicy = getAiAutomationRuntimePolicy(normalized.moduleKey, now)
    if (!runtimePolicy.enabled) {
      return {
        accepted: false,
        reason: 'module_disabled',
      }
    }
    if (!runtimePolicy.invokeEnabled && options?.allowNotifyOnly !== true) {
      return {
        accepted: false,
        reason: 'invoke_disabled',
      }
    }

    pruneAiAutomationFingerprints(now)
    const dedupeWindowMs = getAiAutomationDedupeWindowMs()
    const minAt = Math.max(0, now - dedupeWindowMs)
    if (normalized.fingerprint) {
      const duplicatePending = aiAutomationQueue.value.some((item) => {
        if (item.moduleKey !== normalized.moduleKey) return false
        if (!item.fingerprint || item.fingerprint !== normalized.fingerprint) return false
        return item.createdAt >= minAt
      })
      const duplicateRecent = aiAutomationRuntime.recentFingerprints.some((item) => {
        if (item.moduleKey !== normalized.moduleKey) return false
        return item.fingerprint === normalized.fingerprint && item.at >= minAt
      })
      if (duplicatePending || duplicateRecent) {
        return {
          accepted: false,
          reason: 'deduped',
        }
      }
      aiAutomationRuntime.recentFingerprints = [
        {
          moduleKey: normalized.moduleKey,
          fingerprint: normalized.fingerprint,
          at: now,
        },
        ...aiAutomationRuntime.recentFingerprints,
      ].slice(0, MAX_AI_AUTOMATION_RECENT_FINGERPRINTS)
    }

    aiAutomationQueue.value = [...aiAutomationQueue.value, normalized].slice(-MAX_AI_AUTOMATION_QUEUE_SIZE)
    return {
      accepted: true,
      taskId: normalized.id,
    }
  }

  const removeAiAutomationTaskById = (taskId) => {
    if (!taskId) return false
    const before = aiAutomationQueue.value.length
    aiAutomationQueue.value = aiAutomationQueue.value.filter((item) => item.id !== taskId)
    return aiAutomationQueue.value.length !== before
  }

  const pickNextDueAiAutomationTask = (baseAt = Date.now()) => {
    const now = Number.isFinite(Number(baseAt)) ? Math.max(0, Math.floor(Number(baseAt))) : Date.now()
    const due = aiAutomationQueue.value
      .filter((item) => item.dueAt <= now)
      .sort((left, right) => {
        const priorityDelta =
          getAiAutomationModulePriority(right.moduleKey) - getAiAutomationModulePriority(left.moduleKey)
        if (priorityDelta !== 0) return priorityDelta
        if (left.dueAt !== right.dueAt) return left.dueAt - right.dueAt
        return left.createdAt - right.createdAt
      })
    return due[0] || null
  }

  const deferAiAutomationTask = (taskId, dueAt) => {
    const task = aiAutomationQueue.value.find((item) => item.id === taskId)
    if (!task) return false
    const nextDueAt = Number(dueAt)
    task.dueAt = Number.isFinite(nextDueAt) ? Math.max(0, Math.floor(nextDueAt)) : task.dueAt
    return true
  }

  const runAiAutomationQueueTick = async (baseAt = Date.now()) => {
    const now = Number.isFinite(Number(baseAt)) ? Math.max(0, Math.floor(Number(baseAt))) : Date.now()
    pruneAiAutomationFingerprints(now)

    const nextTask = pickNextDueAiAutomationTask(now)
    if (!nextTask) {
      return {
        handled: false,
        reason: 'no_due_task',
        queueAdvanced: false,
      }
    }

    const policy = getAiAutomationRuntimePolicy(nextTask.moduleKey, now)
    if (!policy.enabled || !policy.invokeEnabled) {
      removeAiAutomationTaskById(nextTask.id)
      return {
        handled: false,
        reason: policy.enabled ? 'invoke_disabled' : 'module_disabled',
        moduleKey: nextTask.moduleKey,
        taskId: nextTask.id,
        queueAdvanced: true,
      }
    }

    const lastExecutedAt = Number(aiAutomationRuntime.lastExecutedAtByModule[nextTask.moduleKey]) || 0
    const cooldownMs = getAiAutomationConflictCooldownMs()
    if (lastExecutedAt > 0 && now - lastExecutedAt < cooldownMs) {
      deferAiAutomationTask(nextTask.id, lastExecutedAt + cooldownMs)
      return {
        handled: false,
        reason: 'cooldown',
        moduleKey: nextTask.moduleKey,
        taskId: nextTask.id,
        queueAdvanced: true,
      }
    }

    const handler = aiAutomationHandlers.get(nextTask.moduleKey)
    if (typeof handler !== 'function') {
      deferAiAutomationTask(nextTask.id, now + cooldownMs)
      return {
        handled: false,
        reason: 'handler_missing_deferred',
        moduleKey: nextTask.moduleKey,
        taskId: nextTask.id,
        queueAdvanced: true,
      }
    }

    const lockReason = nextTask.reason || `queue:${nextTask.id}`
    const locked = tryAcquireAutoExecution(nextTask.moduleKey, lockReason)
    if (!locked) {
      return {
        handled: false,
        reason: 'lock_busy',
        moduleKey: nextTask.moduleKey,
        taskId: nextTask.id,
        queueAdvanced: false,
      }
    }

    try {
      const result = await handler(
        {
          ...nextTask,
          payload: nextTask.payload && typeof nextTask.payload === 'object' ? { ...nextTask.payload } : {},
        },
        {
          now,
          policy,
        },
      )
      removeAiAutomationTaskById(nextTask.id)
      aiAutomationRuntime.lastExecutedAtByModule[nextTask.moduleKey] = Date.now()
      return {
        handled: true,
        moduleKey: nextTask.moduleKey,
        taskId: nextTask.id,
        result,
        queueAdvanced: true,
      }
    } catch (error) {
      const attempts = Math.max(0, toInt(nextTask.attempts, 0)) + 1
      const shouldDrop = attempts >= 3
      if (shouldDrop) {
        removeAiAutomationTaskById(nextTask.id)
      } else {
        const task = aiAutomationQueue.value.find((item) => item.id === nextTask.id)
        if (task) {
          task.attempts = attempts
          task.dueAt = now + cooldownMs
        }
      }
      addApiReport({
        level: 'error',
        module: nextTask.moduleKey,
        action: 'auto_queue_execute',
        code: typeof error?.code === 'string' ? error.code : '',
        message:
          typeof error?.message === 'string' && error.message.trim()
            ? error.message.trim()
            : 'Automation handler failed.',
      })
      return {
        handled: false,
        reason: shouldDrop ? 'handler_error_dropped' : 'handler_error_retry',
        moduleKey: nextTask.moduleKey,
        taskId: nextTask.id,
        queueAdvanced: true,
      }
    } finally {
      releaseAutoExecution(nextTask.moduleKey)
    }
  }

  const tryAcquireAutoExecution = (moduleKey, reason = '') => {
    if (!isAiAutomationInvokeEnabledForModule(moduleKey)) return false

    if (!activeAutoExecution.module) {
      activeAutoExecution.module = moduleKey
      activeAutoExecution.startedAt = Date.now()
      activeAutoExecution.reason = typeof reason === 'string' ? reason : ''
      return true
    }

    return false
  }

  const releaseAutoExecution = (moduleKey) => {
    if (!moduleKey || activeAutoExecution.module !== moduleKey) return false
    activeAutoExecution.module = ''
    activeAutoExecution.startedAt = 0
    activeAutoExecution.reason = ''
    return true
  }

  const addApiReport = (rawReport = {}) => {
    const normalized = normalizeApiReport({
      ...rawReport,
      id: createApiReportId(),
      createdAt:
        typeof rawReport.createdAt === 'number' && Number.isFinite(rawReport.createdAt)
          ? rawReport.createdAt
          : Date.now(),
    })
    if (!normalized) return ''

    apiReports.value = [normalized, ...apiReports.value].slice(0, MAX_API_REPORTS)
    return normalized.id
  }

  const clearApiReports = (options = {}) => {
    const moduleFilter =
      typeof options?.module === 'string' && options.module.trim()
        ? options.module.trim()
        : ''
    const levelFilter =
      options?.level === 'error' || options?.level === 'info' ? options.level : ''

    if (!moduleFilter && !levelFilter) {
      const removedAll = apiReports.value.length
      apiReports.value = []
      return removedAll
    }

    const before = apiReports.value.length
    apiReports.value = apiReports.value.filter((item) => {
      const moduleMatched = moduleFilter ? item?.module === moduleFilter : true
      const levelMatched = levelFilter ? item?.level === levelFilter : true
      const matched = moduleMatched && levelMatched
      return !matched
    })
    return Math.max(0, before - apiReports.value.length)
  }

  const getBackupReminderPolicy = (baseAt = Date.now()) => {
    const now = Number.isFinite(Number(baseAt)) ? Math.max(0, Math.floor(Number(baseAt))) : Date.now()
    const enabled = settings.system.backupReminderEnabled !== false
    const intervalHours = normalizeBackupReminderIntervalHours(
      settings.system.backupReminderIntervalHours,
      BACKUP_REMINDER_DEFAULT_INTERVAL_HOURS,
    )
    const intervalMs = intervalHours * 60 * 60 * 1000
    const lastNotifiedAt = normalizeNonNegativeTimestamp(settings.system.backupReminderLastNotifiedAt, 0)
    const nextDueAt = lastNotifiedAt > 0 ? lastNotifiedAt + intervalMs : 0
    const due = enabled && lastNotifiedAt > 0 && now >= nextDueAt

    return {
      enabled,
      intervalHours,
      intervalMs,
      lastNotifiedAt,
      nextDueAt,
      due,
      now,
    }
  }

  const markBackupExported = (baseAt = Date.now()) => {
    const now = Number.isFinite(Number(baseAt)) ? Math.max(0, Math.floor(Number(baseAt))) : Date.now()
    settings.system.backupReminderLastNotifiedAt = now
    return now
  }

  const checkBackupReminderDue = (baseAt = Date.now(), options = {}) => {
    const runtime = getBackupReminderPolicy(baseAt)
    if (!runtime.enabled) {
      return {
        triggered: false,
        initialized: false,
        reason: 'disabled',
        ...runtime,
      }
    }

    if (runtime.lastNotifiedAt <= 0) {
      settings.system.backupReminderLastNotifiedAt = runtime.now
      return {
        triggered: false,
        initialized: true,
        reason: 'initialized',
        ...runtime,
      }
    }

    if (!runtime.due) {
      return {
        triggered: false,
        initialized: false,
        reason: 'not_due',
        ...runtime,
      }
    }

    const title =
      typeof options.title === 'string' && options.title.trim()
        ? options.title.trim()
        : 'SchatPhone 备份提醒'
    const content =
      typeof options.content === 'string' && options.content.trim()
        ? options.content.trim()
        : '建议导出一次备份，避免浏览器清理后数据丢失。'
    const icon =
      typeof options.icon === 'string' && options.icon.trim()
        ? options.icon.trim()
        : 'fas fa-shield-heart'
    const route =
      typeof options.route === 'string' && options.route.trim()
        ? options.route.trim()
        : '/settings'

    const notificationId = addNotification({
      title,
      content,
      icon,
      route,
      source: 'system_backup_reminder',
      createdAt: runtime.now,
    })

    if (!notificationId) {
      return {
        triggered: false,
        initialized: false,
        reason: 'notification_blocked',
        ...runtime,
      }
    }

    settings.system.backupReminderLastNotifiedAt = runtime.now
    return {
      triggered: true,
      initialized: false,
      reason: 'triggered',
      notificationId,
      ...runtime,
    }
  }

  const getSoftwareUpdateState = () => {
    const normalized = normalizeSoftwareUpdateState(settings.system.softwareUpdate)
    settings.system.softwareUpdate = normalized
    return normalized
  }

  const checkSoftwareUpdate = (baseAt = Date.now()) => {
    const now = normalizeNonNegativeTimestamp(baseAt, Date.now())
    const current = getSoftwareUpdateState()
    const updateAvailable = hasSoftwareUpdateCandidate(current)
    const next = {
      ...current,
      status: current.restartRequired
        ? 'installed'
        : updateAvailable
          ? 'available'
          : 'idle',
      lastCheckedAt: now,
    }
    settings.system.softwareUpdate = next
    return {
      ok: true,
      updateAvailable,
      state: next,
    }
  }

  const installSoftwareUpdate = (baseAt = Date.now()) => {
    const now = normalizeNonNegativeTimestamp(baseAt, Date.now())
    const current = getSoftwareUpdateState()
    if (!hasSoftwareUpdateCandidate(current) && current.restartRequired !== true) {
      const next = {
        ...current,
        status: 'idle',
        lastCheckedAt: now,
      }
      settings.system.softwareUpdate = next
      return {
        ok: false,
        reason: 'no_update',
        notificationId: '',
        state: next,
      }
    }

    const next = {
      ...current,
      status: 'installed',
      downloadedAt: now,
      installedAt: now,
      restartRequired: true,
    }
    settings.system.softwareUpdate = next
    const notificationId = addNotification({
      title: '软件更新已准备好',
      content: `SchatPhone ${next.availableVersion} 已安装，重启后生效。`,
      icon: 'fas fa-arrow-rotate-right',
      route: '/settings?menu=software-update',
      source: 'system_software_update',
      createdAt: now,
    })

    return {
      ok: true,
      reason: 'installed',
      notificationId,
      state: next,
    }
  }

  const postponeSoftwareUpdate = (baseAt = Date.now()) => {
    const now = normalizeNonNegativeTimestamp(baseAt, Date.now())
    const current = getSoftwareUpdateState()
    const next = {
      ...current,
      status: 'postponed',
      lastCheckedAt: current.lastCheckedAt || now,
    }
    settings.system.softwareUpdate = next
    return {
      ok: true,
      state: next,
    }
  }

  const finishSoftwareUpdateRestart = (baseAt = Date.now()) => {
    const now = normalizeNonNegativeTimestamp(baseAt, Date.now())
    const current = getSoftwareUpdateState()
    const next = {
      ...current,
      currentVersion: current.availableVersion || current.currentVersion,
      status: 'idle',
      installedAt: current.installedAt || now,
      restartRequired: false,
    }
    settings.system.softwareUpdate = next
    return {
      ok: true,
      state: next,
    }
  }

  const lockPhone = () => {
    isLocked.value = true
  }

  const unlockPhone = () => {
    isLocked.value = false
  }

  const applyPersistedSnapshot = (persisted = {}) => {
    if (!persisted || typeof persisted !== 'object') return false
    let persistedHomeDesktopSetupVersion = HOME_DESKTOP_SETUP_VERSION
    const persistedWorldAppHomeTileIds = worldAppHomeTileIdsFromUserSnapshot(persisted.user)

    if (persisted.settings?.api && typeof persisted.settings.api === 'object') {
      Object.assign(settings.api, persisted.settings.api)
      if (!Array.isArray(settings.api.presets)) {
        settings.api.presets = []
      }
      if (typeof settings.api.activePresetId !== 'string') {
        settings.api.activePresetId = ''
      }
    }

    if (persisted.settings?.appearance && typeof persisted.settings.appearance === 'object') {
      const appearance = persisted.settings.appearance
      persistedHomeDesktopSetupVersion = normalizeHomeDesktopSetupVersion(
        appearance.homeDesktopSetupVersion,
      )
      settings.appearance.homeDesktopSetupVersion = persistedHomeDesktopSetupVersion

      if (typeof appearance.currentTheme === 'string') {
        settings.appearance.currentTheme = normalizeThemeId(appearance.currentTheme)
      }
      const inferredThemeWallpaper = getThemeWallpaper(settings.appearance.currentTheme)
      settings.appearance.wallpaperMode =
        typeof appearance.wallpaperMode === 'string'
          ? normalizeWallpaperMode(appearance.wallpaperMode, settings.appearance.wallpaperMode)
          : typeof appearance.wallpaper === 'string' && appearance.wallpaper.trim()
            ? appearance.wallpaper.trim() === inferredThemeWallpaper || isLegacyThemeWallpaper(appearance.wallpaper)
              ? DEFAULT_WALLPAPER_MODE
              : 'url'
            : DEFAULT_WALLPAPER_MODE
      settings.appearance.wallpaperAssetId = normalizeWallpaperAssetId(appearance.wallpaperAssetId)
      if (typeof appearance.wallpaper === 'string') {
        settings.appearance.wallpaper = appearance.wallpaper
      }
      if (
        settings.appearance.currentTheme === 'default' &&
        isLegacyThemeWallpaper(settings.appearance.wallpaper)
      ) {
        settings.appearance.wallpaperMode = DEFAULT_WALLPAPER_MODE
        settings.appearance.wallpaperAssetId = ''
        settings.appearance.wallpaper = getThemeWallpaper(settings.appearance.currentTheme)
      }
      if (typeof appearance.showStatusBar === 'boolean') {
        settings.appearance.showStatusBar = appearance.showStatusBar
      }
      if (typeof appearance.hapticFeedbackEnabled === 'boolean') {
        settings.appearance.hapticFeedbackEnabled = appearance.hapticFeedbackEnabled
      }
      if (typeof appearance.customCss === 'string') {
        settings.appearance.customCss = appearance.customCss
      }
      settings.appearance.scopedCustomCss = normalizeScopedCustomCss(appearance.scopedCustomCss)
      settings.appearance.appSkins = normalizeAppSkinSettings(appearance.appSkins)
      if (appearance.customVars && typeof appearance.customVars === 'object') {
        settings.appearance.customVars = { ...appearance.customVars }
      }
      settings.appearance.appIconOverrides = normalizeAppIconOverrides(
        appearance.appIconOverrides,
      )
      settings.appearance.entryPresentationOverrides = normalizeEntryPresentationOverrides(
        appearance.entryPresentationOverrides,
      )
      settings.appearance.appStoreMiniAppPlacements = normalizeAppStoreMiniAppPlacements(
        appearance.appStoreMiniAppPlacements,
      )
      if (typeof appearance.lockClockStyle === 'string') {
        settings.appearance.lockClockStyle = normalizeLockClockStyle(appearance.lockClockStyle)
      }
      settings.appearance.chat = normalizeChatAppearance(appearance.chat)

      settings.appearance.customWidgets = normalizeCustomWidgets(appearance.customWidgets)
      settings.appearance.homeWidgetPages = normalizeHomeWidgetPagesForCurrentSettings(
        appearance.homeWidgetPages,
        currentCustomWidgetIds(),
        { dynamicHomeTileIds: persistedWorldAppHomeTileIds },
      )
      settings.appearance.homeLayoutTemplateIds = normalizeHomeLayoutTemplateIds(
        appearance.homeLayoutTemplateIds,
        settings.appearance.homeWidgetPages.length || MIN_HOME_PAGES,
      )
      settings.appearance.homeLayoutSlotPlacements = hasAnyHomeLayoutSlotPlacement(
        appearance.homeLayoutSlotPlacements,
      )
        ? normalizeHomeLayoutSlotPlacements(
            appearance.homeLayoutSlotPlacements,
            settings.appearance.homeWidgetPages,
            settings.appearance.homeLayoutTemplateIds,
            homeTileSizeKey,
          )
        : createHomeLayoutSlotPlacementsFromPages(
            settings.appearance.homeWidgetPages,
            settings.appearance.homeLayoutTemplateIds,
          )
    }

    if (persisted.settings?.system && typeof persisted.settings.system === 'object') {
      Object.assign(settings.system, persisted.settings.system)
      settings.system.language = normalizeSystemLanguage(settings.system.language)
      settings.system.notifications = settings.system.notifications !== false
      settings.system.realPushEnabled = settings.system.realPushEnabled === true
      settings.system.pushDisplayMode = normalizePushDisplayMode(
        settings.system.pushDisplayMode,
        'minimal',
      )
      settings.system.pushServerUrl = normalizePushServerUrl(
        settings.system.pushServerUrl,
        DEFAULT_PUSH_SERVER_URL,
      )
      settings.system.pushPermission = normalizePushPermission(
        settings.system.pushPermission,
        syncPushPermissionFromBrowser(),
      )
      settings.system.pushDeviceId =
        typeof settings.system.pushDeviceId === 'string'
          ? settings.system.pushDeviceId.trim().slice(0, 120)
          : ''
      settings.system.pushSubscriptionActive = settings.system.pushSubscriptionActive === true
      settings.system.pushLastSyncedAt = normalizeNonNegativeTimestamp(
        settings.system.pushLastSyncedAt,
        0,
      )
      settings.system.pushLastError = normalizePushError(settings.system.pushLastError, '')
      settings.system.pushVapidPublicKey =
        typeof settings.system.pushVapidPublicKey === 'string'
          ? settings.system.pushVapidPublicKey.trim().slice(0, 160)
          : ''
      settings.system.backupReminderEnabled = settings.system.backupReminderEnabled !== false
      settings.system.backupReminderIntervalHours = normalizeBackupReminderIntervalHours(
        settings.system.backupReminderIntervalHours,
        BACKUP_REMINDER_DEFAULT_INTERVAL_HOURS,
      )
      settings.system.backupReminderLastNotifiedAt = normalizeNonNegativeTimestamp(
        settings.system.backupReminderLastNotifiedAt,
        0,
      )
      settings.system.backupCopyTone = normalizeBackupCopyTone(
        settings.system.backupCopyTone,
        DEFAULT_BACKUP_COPY_TONE,
      )
      settings.system.softwareUpdate = normalizeSoftwareUpdateState(
        settings.system.softwareUpdate,
      )
    }

    if (persisted.settings?.more && typeof persisted.settings.more === 'object') {
      settings.more = normalizeMoreSettings(persisted.settings.more)
    } else {
      settings.more = normalizeMoreSettings(settings.more)
    }
    normalizeCurrentHomeWidgetPages({ dynamicHomeTileIds: persistedWorldAppHomeTileIds })

    if (persisted.settings?.aiAutomation && typeof persisted.settings.aiAutomation === 'object') {
      settings.aiAutomation = normalizeAiAutomationSettings(persisted.settings.aiAutomation)
    } else {
      settings.aiAutomation = normalizeAiAutomationSettings(settings.aiAutomation)
    }

    const persistedUser = persisted.user && typeof persisted.user === 'object' ? persisted.user : null
    if (persistedUser) {
      Object.assign(user, persistedUser)
    }
    user.avatarImage = normalizeUserAvatarImageSource(user)
    user.avatar = user.avatarImage.sourceType === 'url' ? user.avatarImage.url : ''
    const normalizedWorldKernel = normalizeUserWorldKernel(
      persistedUser || user,
      user.globalWorldview || DEFAULT_GLOBAL_WORLDVIEW,
    )
    user.globalWorldview = normalizedWorldKernel.globalWorldview
    user.worldBook = normalizedWorldKernel.globalWorldview
    user.worldBookSourceLinks = normalizedWorldKernel.worldBookSourceLinks
    user.worldPacks = normalizedWorldKernel.worldPacks
    user.worldProfileAnalysis = normalizedWorldKernel.worldProfileAnalysis
    user.enabledWorldPackIds = normalizedWorldKernel.enabledWorldPackIds
    user.worldPackEnablements = normalizedWorldKernel.worldPackEnablements
    user.activeWorldPackId = normalizedWorldKernel.activeWorldPackId
    user.worldPackActivation = normalizedWorldKernel.worldPackActivation
    user.encyclopediaEntries = normalizedWorldKernel.encyclopediaEntries
    user.knowledgePoints = user.encyclopediaEntries
    user.profileTemplates = normalizedWorldKernel.profileTemplates
    if (typeof user.chatStatus !== 'string') {
      user.chatStatus = 'idle'
    }

    if (Array.isArray(persisted.notifications)) {
      notifications.value = persisted.notifications
        .map((note) => normalizeNotification(note))
        .filter(Boolean)
        .slice(0, MAX_NOTIFICATIONS)
    }

    if (Array.isArray(persisted.apiReports)) {
      apiReports.value = persisted.apiReports
        .map((report) => normalizeApiReport(report))
        .filter(Boolean)
        .slice(0, MAX_API_REPORTS)
    } else {
      apiReports.value = []
    }

    if (persisted.truthState && typeof persisted.truthState === 'object') {
      const normalizedTruthState = normalizeTruthState(persisted.truthState)
      truthState.chatEntities = normalizedTruthState.chatEntities
      truthState.chatEvents = normalizedTruthState.chatEvents
      truthState.lastUpdatedAt = normalizedTruthState.lastUpdatedAt
    } else {
      const normalizedTruthState = normalizeTruthState(truthState)
      truthState.chatEntities = normalizedTruthState.chatEntities
      truthState.chatEvents = normalizedTruthState.chatEvents
      truthState.lastUpdatedAt = normalizedTruthState.lastUpdatedAt
    }

    settings.appearance.currentTheme = normalizeThemeId(settings.appearance.currentTheme)
    const hasTheme = availableThemes.value.some((theme) => theme.id === settings.appearance.currentTheme)
    if (!hasTheme) {
      settings.appearance.currentTheme = availableThemes.value[0]?.id || 'default'
    }

    settings.appearance.wallpaperMode = normalizeWallpaperMode(
      settings.appearance.wallpaperMode,
      DEFAULT_WALLPAPER_MODE,
    )
    settings.appearance.wallpaperAssetId = normalizeWallpaperAssetId(
      settings.appearance.wallpaperAssetId,
    )
    const resolvedThemeWallpaper = getThemeWallpaper(settings.appearance.currentTheme)
    if (settings.appearance.wallpaperMode === DEFAULT_WALLPAPER_MODE) {
      settings.appearance.wallpaperAssetId = ''
      settings.appearance.wallpaper = resolvedThemeWallpaper || settings.appearance.wallpaper
    } else if (settings.appearance.wallpaperMode === 'gallery') {
      if (!settings.appearance.wallpaperAssetId) {
        useThemeWallpaper()
      }
    } else {
      settings.appearance.wallpaper = typeof settings.appearance.wallpaper === 'string'
        ? settings.appearance.wallpaper.trim()
        : ''
      settings.appearance.wallpaperAssetId = ''
      if (!settings.appearance.wallpaper) {
        useThemeWallpaper()
      }
    }

    settings.appearance.customWidgets = normalizeCustomWidgets(settings.appearance.customWidgets)
    settings.appearance.appIconOverrides = normalizeAppIconOverrides(
      settings.appearance.appIconOverrides,
    )
    settings.appearance.entryPresentationOverrides = normalizeEntryPresentationOverrides(
      settings.appearance.entryPresentationOverrides,
    )
    settings.appearance.appStoreMiniAppPlacements = normalizeAppStoreMiniAppPlacements(
      settings.appearance.appStoreMiniAppPlacements,
    )
    settings.appearance.homeWidgetPages = normalizeHomeWidgetPagesForCurrentSettings(
      settings.appearance.homeWidgetPages,
      currentCustomWidgetIds(),
    )
    settings.appearance.homeLayoutTemplateIds = normalizeHomeLayoutTemplateIds(
      settings.appearance.homeLayoutTemplateIds,
      settings.appearance.homeWidgetPages.length || MIN_HOME_PAGES,
    )
    settings.appearance.homeLayoutSlotPlacements = hasAnyHomeLayoutSlotPlacement(
      settings.appearance.homeLayoutSlotPlacements,
    )
      ? normalizeHomeLayoutSlotPlacements(
          settings.appearance.homeLayoutSlotPlacements,
          settings.appearance.homeWidgetPages,
          settings.appearance.homeLayoutTemplateIds,
          homeTileSizeKey,
        )
        : createHomeLayoutSlotPlacementsFromPages(
            settings.appearance.homeWidgetPages,
            settings.appearance.homeLayoutTemplateIds,
          )
    migrateHomeDesktopLayoutAfterHydration(persistedHomeDesktopSetupVersion)
    settings.appearance.lockClockStyle = normalizeLockClockStyle(settings.appearance.lockClockStyle)
    settings.appearance.scopedCustomCss = normalizeScopedCustomCss(settings.appearance.scopedCustomCss)
    settings.appearance.appSkins = normalizeAppSkinSettings(settings.appearance.appSkins)
    settings.appearance.chat = normalizeChatAppearance(settings.appearance.chat)
    settings.system.notifications = settings.system.notifications !== false
    settings.system.realPushEnabled = settings.system.realPushEnabled === true
    settings.system.pushDisplayMode = normalizePushDisplayMode(
      settings.system.pushDisplayMode,
      'minimal',
    )
    settings.system.pushServerUrl = normalizePushServerUrl(
      settings.system.pushServerUrl,
      DEFAULT_PUSH_SERVER_URL,
    )
    settings.system.pushPermission = normalizePushPermission(
      settings.system.pushPermission,
      syncPushPermissionFromBrowser(),
    )
    settings.system.pushDeviceId =
      typeof settings.system.pushDeviceId === 'string'
        ? settings.system.pushDeviceId.trim().slice(0, 120)
        : ''
    settings.system.pushSubscriptionActive = settings.system.pushSubscriptionActive === true
    settings.system.pushLastSyncedAt = normalizeNonNegativeTimestamp(
      settings.system.pushLastSyncedAt,
      0,
    )
    settings.system.pushLastError = normalizePushError(settings.system.pushLastError, '')
    settings.system.pushVapidPublicKey =
      typeof settings.system.pushVapidPublicKey === 'string'
        ? settings.system.pushVapidPublicKey.trim().slice(0, 160)
        : ''
    settings.system.backupReminderEnabled = settings.system.backupReminderEnabled !== false
    settings.system.backupReminderIntervalHours = normalizeBackupReminderIntervalHours(
      settings.system.backupReminderIntervalHours,
      BACKUP_REMINDER_DEFAULT_INTERVAL_HOURS,
    )
    settings.system.backupReminderLastNotifiedAt = normalizeNonNegativeTimestamp(
      settings.system.backupReminderLastNotifiedAt,
      0,
    )
    settings.system.backupCopyTone = normalizeBackupCopyTone(
      settings.system.backupCopyTone,
      DEFAULT_BACKUP_COPY_TONE,
    )
    settings.system.softwareUpdate = normalizeSoftwareUpdateState(
      settings.system.softwareUpdate,
    )
    settings.more = normalizeMoreSettings(settings.more)
    return true
  }

  const hasFinishedStorageHydration = ref(false)

  const hydrateFromStorage = () => {
    const persisted = readPersistedState(SYSTEM_STORAGE_KEY, {
      version: SYSTEM_STORAGE_VERSION,
    })

    if (!persisted || typeof persisted !== 'object') return false
    applyPersistedSnapshot(persisted)
    return true
  }

  const hydrateFromStorageAsync = async () => {
    const persisted = await readPersistedStateAsync(SYSTEM_STORAGE_KEY, {
      version: SYSTEM_STORAGE_VERSION,
    })
    if (!persisted || typeof persisted !== 'object') return false
    applyPersistedSnapshot(persisted)
    return true
  }

  const restoreFromBackup = (snapshot = {}) => {
    const source =
      snapshot && typeof snapshot.system === 'object' && snapshot.system
        ? snapshot.system
        : snapshot
    return applyPersistedSnapshot(source)
  }

  const persistToStorage = () => {
    writePersistedState(
      SYSTEM_STORAGE_KEY,
      {
        settings: {
          api: { ...settings.api },
          appearance: {
            ...settings.appearance,
            chat: normalizeChatAppearance(settings.appearance.chat),
            scopedCustomCss: normalizeScopedCustomCss(settings.appearance.scopedCustomCss),
            appSkins: normalizeAppSkinSettings(settings.appearance.appSkins),
            customVars: { ...settings.appearance.customVars },
            appIconOverrides: normalizeAppIconOverrides(settings.appearance.appIconOverrides),
            entryPresentationOverrides: normalizeEntryPresentationOverrides(
              settings.appearance.entryPresentationOverrides,
            ),
            appStoreMiniAppPlacements: normalizeAppStoreMiniAppPlacements(
              settings.appearance.appStoreMiniAppPlacements,
            ),
            homeWidgetPages: settings.appearance.homeWidgetPages.map((page) => [...page]),
            homeLayoutTemplateIds: settings.appearance.homeLayoutTemplateIds.map(
              (templateId) => templateId,
            ),
            homeLayoutSlotPlacements: settings.appearance.homeLayoutSlotPlacements.map((page) =>
              Array.isArray(page) ? page.map((placement) => ({ ...placement })) : [],
            ),
            customWidgets: settings.appearance.customWidgets.map((widget) => ({
              ...widget,
              action: normalizeCustomWidgetAction(widget.action),
            })),
          },
          system: { ...settings.system },
          more: {
            featureToggles: {
              ...normalizeMoreSettings(settings.more).featureToggles,
            },
          },
          aiAutomation: {
            ...settings.aiAutomation,
            modules: Object.fromEntries(
              AI_AUTOMATION_MODULE_KEYS.map((moduleKey) => [
                moduleKey,
                {
                  ...settings.aiAutomation.modules[moduleKey],
                },
              ]),
            ),
          },
        },
        user: {
          ...user,
          worldBook: user.globalWorldview,
          globalWorldview: user.globalWorldview,
          worldBookSourceLinks: normalizeWorldBookSourceLinks(user.worldBookSourceLinks).map((link) => ({
            ...link,
            sectionIds: Array.isArray(link.sectionIds) ? [...link.sectionIds] : [],
          })),
          worldPacks: normalizeWorldPacks(user.worldPacks).map((pack) => ({
            ...pack,
            encyclopediaEntryIds: Array.isArray(pack.encyclopediaEntryIds)
              ? [...pack.encyclopediaEntryIds]
              : Array.isArray(pack.knowledgePointIds)
                ? [...pack.knowledgePointIds]
                : [],
            knowledgePointIds: Array.isArray(pack.encyclopediaEntryIds)
              ? [...pack.encyclopediaEntryIds]
              : Array.isArray(pack.knowledgePointIds)
                ? [...pack.knowledgePointIds]
                : [],
            profileTemplateIds: Array.isArray(pack.profileTemplateIds) ? [...pack.profileTemplateIds] : [],
            bookSourceLinkIds: Array.isArray(pack.bookSourceLinkIds) ? [...pack.bookSourceLinkIds] : [],
            relationshipCategories: Array.isArray(pack.relationshipCategories)
              ? pack.relationshipCategories.map((item) => ({ ...item }))
              : [],
            relationshipModifiers: Array.isArray(pack.relationshipModifiers)
              ? pack.relationshipModifiers.map((item) => ({ ...item }))
              : [],
            appBindings: Array.isArray(pack.appBindings)
              ? pack.appBindings.map((binding) => ({ ...binding }))
              : [],
            serviceAccountTemplates: Array.isArray(pack.serviceAccountTemplates)
              ? pack.serviceAccountTemplates.map((template) => ({ ...template }))
              : [],
            terminology: pack.terminology && typeof pack.terminology === 'object' ? { ...pack.terminology } : {},
            economy: pack.economy && typeof pack.economy === 'object'
              ? {
                  ...pack.economy,
                  currencies: Array.isArray(pack.economy.currencies)
                    ? pack.economy.currencies.map((currency) => ({ ...currency }))
                    : [],
                }
              : { currencies: [] },
          })),
          activeWorldPackId: user.activeWorldPackId || DEFAULT_WORLD_PACK_ID,
          worldPackActivation: normalizeWorldPackActivation(user.worldPackActivation, user.activeWorldPackId),
          worldProfileAnalysis: { ...normalizeWorldProfile(user.worldProfileAnalysis) },
          enabledWorldPackIds: normalizeWorldPackIdList(user.enabledWorldPackIds),
          worldPackEnablements: normalizeWorldPackEnablements(user.worldPackEnablements),
          encyclopediaEntries: Array.isArray(user.encyclopediaEntries)
            ? user.encyclopediaEntries.map((item) => ({
                ...item,
                tags: Array.isArray(item.tags) ? [...item.tags] : [],
              }))
            : [],
          knowledgePoints: Array.isArray(user.encyclopediaEntries)
            ? user.encyclopediaEntries.map((item) => ({
                ...item,
                tags: Array.isArray(item.tags) ? [...item.tags] : [],
              }))
            : [],
          profileTemplates: normalizeProfileTemplates(user.profileTemplates).map(cloneProfileTemplate),
        },
        notifications: notifications.value.map((note) => ({ ...note })),
        apiReports: apiReports.value.map((report) => ({ ...report })),
        truthState: {
          chatEntities: Object.fromEntries(
            Object.entries(truthState.chatEntities).map(([entityKey, entity]) => [
              entityKey,
              {
                ...entity,
              },
            ]),
          ),
          chatEvents: truthState.chatEvents.map((event) => ({
            ...event,
            payload: event.payload && typeof event.payload === 'object'
              ? {
                  ...event.payload,
                }
              : {},
          })),
          lastUpdatedAt: truthState.lastUpdatedAt,
        },
      },
      { version: SYSTEM_STORAGE_VERSION },
    )
  }

  const saveNow = () => {
    persistToStorage()
  }

  const hydratedFromLocal = hydrateFromStorage()
  void (async () => {
    if (!hydratedFromLocal) {
      await hydrateFromStorageAsync()
    }
    hasFinishedStorageHydration.value = true
    persistToStorage()
  })()

  watch(
    [settings, user, notifications, apiReports, truthState],
    () => {
      if (!hasFinishedStorageHydration.value) return
      persistToStorage()
    },
    { deep: true },
  )

  return {
    settings,
    user,
    hasFinishedStorageHydration,
    notifications,
    apiReports,
    aiAutomationQueue,
    truthState,
    isLocked,
    activeAutoExecution,
    availableThemes,
    setTheme,
    getThemeWallpaper,
    useThemeWallpaper,
    setAppearanceWallpaperUrl,
    setAppearanceWallpaperAsset,
    clearAppearanceWallpaperAsset,
    cycleTheme,
    setCustomCss,
    setScopedCustomCss,
    setAppSkin,
    resetAppSkin,
    setAppIconOverride,
    clearAppIconOverride,
    setEntryPresentationOverride,
    clearEntryPresentationOverride,
    setAppStoreMiniAppInstalled,
    exportAppearancePack,
    importAppearancePack,
    setChatAppearance,
    setCustomVar,
    removeCustomVar,
    recommendHomeDesktopRefresh,
    applyCurrentHomeDesktopDefaults,
    setHomeWidgetPages,
    resetHomeWidgetPages,
    setHomeLayoutTemplate,
    setHomeLayoutSlotPlacement,
    clearHomeLayoutSlotPlacement,
    addCustomWidget,
    updateCustomWidget,
    removeCustomWidget,
    placeCustomWidget,
    importCustomWidgets,
    placeBuiltInWidgetTile,
    restoreBuiltInWidgetTile,
    isMoreFeatureToggleEnabled,
    setMoreFeatureToggle,
    toggleMoreFeatureToggle,
    getUserAiContextSummary,
    addNotification,
    markNotificationRead,
    markAllNotificationsRead,
    removeNotification,
    clearNotifications,
    syncPushPermissionFromBrowser,
    setPushState,
    setGlobalWorldview,
    getEncyclopediaEntryById,
    listEncyclopediaEntries,
    findRelevantEncyclopediaEntries,
    upsertEncyclopediaEntry,
    setEncyclopediaEntryEnabled,
    removeEncyclopediaEntry,
    getKnowledgePointById,
    listKnowledgePoints,
    findRelevantKnowledgePoints,
    upsertKnowledgePoint,
    setKnowledgePointEnabled,
    removeKnowledgePoint,
    listWorldBookSourceLinks,
    addWorldBookSourceLink,
    updateWorldBookSourceLink,
    removeWorldBookSourceLink,
    listWorldPacks,
    getWorldPackById,
    getActiveWorldPack,
    setWorldProfileAnalysis,
    listEnabledWorldPacks,
    buildWorldPackRecommendationReview,
    buildWorldPackEnablementReview,
    enableWorldPack,
    disableWorldPack,
    buildWorldPackActivationReview,
    activateWorldPack,
    upsertWorldPack,
    updateWorldPackEconomy,
    updateWorldServiceAccountTemplate,
    resetWorldServiceAccountTemplate,
    listWorldAppTemplates,
    buildWorldAppTemplateExtractionReview,
    confirmWorldAppTemplateProposal,
    buildWorldServiceTemplateProposalReview,
    confirmWorldServiceTemplateProposal,
    listProfileTemplates,
    listProfileTemplatePresets,
    listWorldProfileTemplates,
    getProfileTemplateById,
    upsertProfileTemplate,
    createWorldProfileTemplateFromPreset,
    updateWorldProfileTemplate,
    setWorldProfileTemplateEnabled,
    touchChatTruth,
    getChatTruthSnapshot,
    clearChatTruthState,
    isAiAutomationEnabledForModule,
    isAiAutomationQuietHoursActive,
    getAiAutomationRuntimePolicy,
    isAiAutomationInvokeEnabledForModule,
    getAiAutomationModulePriority,
    registerAiAutomationHandler,
    unregisterAiAutomationHandler,
    getAiAutomationQueueSnapshot,
    clearAiAutomationQueue,
    enqueueAiAutomationTask,
    runAiAutomationQueueTick,
    tryAcquireAutoExecution,
    releaseAutoExecution,
    addApiReport,
    clearApiReports,
    dispatchNotificationToRealPush,
    getBackupReminderPolicy,
    markBackupExported,
    checkBackupReminderDue,
    checkSoftwareUpdate,
    installSoftwareUpdate,
    postponeSoftwareUpdate,
    finishSoftwareUpdateRestart,
    lockPhone,
    unlockPhone,
    saveNow,
    hydrateFromStorage,
    hydrateFromStorageAsync,
    restoreFromStorage: hydrateFromStorage,
    restoreFromBackup,
  }
})
