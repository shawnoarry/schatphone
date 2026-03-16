import { defineStore } from 'pinia'
import { reactive, ref, watch } from 'vue'
import { readPersistedState, writePersistedState } from '../lib/persistence'
import { DEFAULT_SYSTEM_LANGUAGE, normalizeSystemLanguage } from '../lib/locale'
import { VALID_WIDGET_SIZES, validateWidgetImportPayload } from '../lib/widget-schema'

const AVAILABLE_THEMES = [
  {
    id: 'y2k',
    name: 'Y2K Vapor',
    preview: 'linear-gradient(180deg, #ff9a9e 0%, #fad0c4 55%, #ffd1ff 100%)',
    darkText: false,
    wallpaper:
      'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1000&q=80',
  },
  {
    id: 'zen',
    name: 'Pure White',
    preview: 'linear-gradient(180deg, #ffffff 0%, #f3f4f6 100%)',
    darkText: true,
    wallpaper:
      'https://images.unsplash.com/photo-1501854140801-50d01698950b?auto=format&fit=crop&w=1000&q=80',
  },
]

const DEFAULT_WIDGET_PAGES = [
  ['weather', 'calendar', 'music', 'app_network', 'app_chat', 'app_wallet', 'app_themes'],
  [
    'system',
    'quick_heart',
    'quick_disc',
    'app_phone',
    'app_map',
    'app_calendar',
    'app_files',
    'app_stock',
    'app_more',
  ],
  [],
  [],
  [],
]

const HOME_TILE_ALIASES = {
  app_mail: 'app_network',
  app_maps: 'app_map',
  app_profile: 'app_chat',
  app_worldbook: 'app_files',
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
  'app_phone',
  'app_map',
  'app_calendar',
  'app_stock',
  'app_chat',
  'app_contacts',
  'app_settings',
  'app_gallery',
  'app_files',
  'app_more',
]
const BUILT_IN_WIDGET_TILE_IDS = CORE_HOME_TILE_IDS.filter(
  (tileId) => typeof tileId === 'string' && !tileId.startsWith('app_'),
)

const MIN_HOME_PAGES = 5

const LOCKED_HOME_TILE_IDS = DEFAULT_WIDGET_PAGES
  .flat()
  .filter((tileId) => typeof tileId === 'string' && tileId.startsWith('app_'))
const DEFAULT_TILE_PAGE_INDEX = Object.fromEntries(
  DEFAULT_WIDGET_PAGES.flatMap((page, pageIndex) => page.map((tileId) => [tileId, pageIndex])),
)

const CUSTOM_WIDGET_ID_PREFIX = 'custom_widget_'
const CUSTOM_WIDGET_SIZES = [...VALID_WIDGET_SIZES]
const VALID_LOCK_CLOCK_STYLES = ['classic', 'outline', 'mono']
const DEFAULT_LOCK_CLOCK_STYLE = 'classic'
const MAX_NOTIFICATIONS = 80
const MAX_API_REPORTS = 200

const SYSTEM_STORAGE_KEY = 'store:system'
const SYSTEM_STORAGE_VERSION = 1

const AI_AUTOMATION_MODULE_KEYS = ['chat', 'map', 'shopping']
const DEFAULT_AI_AUTOMATION_SETTINGS = Object.freeze({
  masterEnabled: false,
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

const createDefaultAiAutomationSettings = () => ({
  masterEnabled: DEFAULT_AI_AUTOMATION_SETTINGS.masterEnabled,
  conflictCooldownSec: DEFAULT_AI_AUTOMATION_SETTINGS.conflictCooldownSec,
  dedupeWindowSec: DEFAULT_AI_AUTOMATION_SETTINGS.dedupeWindowSec,
  modules: {
    chat: { ...DEFAULT_AI_AUTOMATION_SETTINGS.modules.chat },
    map: { ...DEFAULT_AI_AUTOMATION_SETTINGS.modules.map },
    shopping: { ...DEFAULT_AI_AUTOMATION_SETTINGS.modules.shopping },
  },
})

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
        createdAt:
          typeof widget.createdAt === 'number' && Number.isFinite(widget.createdAt)
            ? widget.createdAt
            : Date.now(),
      }
    })
    .filter(Boolean)
}

const normalizeHomeWidgetPages = (pages, customWidgetIds = []) => {
  const allowedIds = new Set([...CORE_HOME_TILE_IDS, ...customWidgetIds])

  if (!Array.isArray(pages)) {
    return cloneDefaultWidgetPages()
  }

  const seen = new Set()
  const normalized = pages
    .filter((page) => Array.isArray(page))
    .map((page) =>
      page
        .map((tileId) => HOME_TILE_ALIASES[tileId] || tileId)
        .filter((tileId) => {
          if (!allowedIds.has(tileId)) return false
          if (seen.has(tileId)) return false
          seen.add(tileId)
          return true
        }),
    )

  if (normalized.length === 0) {
    return cloneDefaultWidgetPages()
  }

  const withMinimumPages = ensureMinimumHomePages(normalized)

  LOCKED_HOME_TILE_IDS.forEach((tileId) => {
    if (seen.has(tileId)) return
    const targetPage = DEFAULT_TILE_PAGE_INDEX[tileId] ?? 0
    while (withMinimumPages.length <= targetPage) {
      withMinimumPages.push([])
    }
    withMinimumPages[targetPage].push(tileId)
    seen.add(tileId)
  })

  return withMinimumPages
}

const createCustomWidgetId = () =>
  `${CUSTOM_WIDGET_ID_PREFIX}${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

const createNotificationId = () =>
  `note_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

const createApiReportId = () =>
  `api_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

const normalizeLockClockStyle = (value) =>
  VALID_LOCK_CLOCK_STYLES.includes(value) ? value : DEFAULT_LOCK_CLOCK_STYLE

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

export const useSystemStore = defineStore('system', () => {
  const availableThemes = ref(AVAILABLE_THEMES)

  const settings = reactive({
    api: {
      url: 'https://api.openai.com/v1/chat/completions',
      key: '',
      model: 'gpt-4o-mini',
      resolvedKind: 'openai_compatible',
      presets: [],
      activePresetId: '',
    },
    appearance: {
      currentTheme: 'y2k',
      wallpaper: AVAILABLE_THEMES[0].wallpaper,
      showStatusBar: true,
      hapticFeedbackEnabled: true,
      customCss: '',
      customVars: {},
      homeWidgetPages: cloneDefaultWidgetPages(),
      customWidgets: [],
      lockClockStyle: DEFAULT_LOCK_CLOCK_STYLE,
    },
    system: {
      language: DEFAULT_SYSTEM_LANGUAGE,
      timezone: 'Asia/Shanghai',
      notifications: true,
    },
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
    worldBook:
      '这是一个赛博朋克风格的近未来世界。科技高度发达，但生活水平差距巨大。大型公司控制着资源与秩序。',
  })

  const notifications = ref([])
  const apiReports = ref([])
  const isLocked = ref(true)
  const activeAutoExecution = reactive({
    module: '',
    startedAt: 0,
    reason: '',
  })

  const currentCustomWidgetIds = () =>
    settings.appearance.customWidgets.map((widget) => widget.id)

  const setTheme = (themeId) => {
    const theme = availableThemes.value.find((item) => item.id === themeId)
    if (!theme) return
    settings.appearance.currentTheme = theme.id
    settings.appearance.wallpaper = theme.wallpaper
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
    settings.appearance.homeWidgetPages = normalizeHomeWidgetPages(pages, currentCustomWidgetIds())
  }

  const resetHomeWidgetPages = () => {
    settings.appearance.homeWidgetPages = cloneDefaultWidgetPages()
  }

  const addCustomWidget = ({ name, size, code, pageIndex = 0 } = {}) => {
    const widget = {
      id: createCustomWidgetId(),
      name: typeof name === 'string' && name.trim() ? name.trim() : '自定义组件',
      size: normalizeCustomWidgetSize(size),
      code: typeof code === 'string' ? code : '',
      createdAt: Date.now(),
    }

    settings.appearance.customWidgets = [...settings.appearance.customWidgets, widget]

    const nextPages = settings.appearance.homeWidgetPages.map((page) => [...page])
    const targetPage = Number.isInteger(pageIndex) ? Math.max(0, pageIndex) : 0

    while (nextPages.length <= targetPage) {
      nextPages.push([])
    }

    nextPages[targetPage].push(widget.id)
    settings.appearance.homeWidgetPages = normalizeHomeWidgetPages(nextPages, currentCustomWidgetIds())

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
    }

    const nextWidgets = settings.appearance.customWidgets.map((item, idx) => (idx === index ? next : item))
    settings.appearance.customWidgets = nextWidgets
    settings.appearance.homeWidgetPages = normalizeHomeWidgetPages(
      settings.appearance.homeWidgetPages,
      currentCustomWidgetIds(),
    )
    return true
  }

  const removeCustomWidget = (widgetId) => {
    const nextWidgets = settings.appearance.customWidgets.filter((item) => item.id !== widgetId)
    settings.appearance.customWidgets = nextWidgets

    const nextPages = settings.appearance.homeWidgetPages.map((page) =>
      page.filter((tileId) => tileId !== widgetId),
    )
    settings.appearance.homeWidgetPages = normalizeHomeWidgetPages(nextPages, currentCustomWidgetIds())
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
    settings.appearance.homeWidgetPages = normalizeHomeWidgetPages(nextPages, currentCustomWidgetIds())
  }

  const importCustomWidgets = (importPayload, pageIndex = 0, options = {}) => {
    const validation = validateWidgetImportPayload(importPayload, {
      fallbackName: '自定义组件',
      ...options,
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

    try {
      const now = Date.now()
      const importedWidgets = validation.items.map((item, index) => ({
        id: `${CUSTOM_WIDGET_ID_PREFIX}${now + index}_${Math.random().toString(36).slice(2, 8)}`,
        name: item.name,
        size: normalizeCustomWidgetSize(item.size),
        code: item.code,
        createdAt: now + index,
      }))

      const mergedWidgets = [...currentWidgetsSnapshot, ...importedWidgets]
      const nextPages = currentPagesSnapshot.map((page) => [...page])
      const targetPage = Number.isInteger(pageIndex) ? Math.max(0, pageIndex) : 0

      while (nextPages.length <= targetPage) {
        nextPages.push([])
      }
      importedWidgets.forEach((widget) => {
        nextPages[targetPage].push(widget.id)
      })

      const mergedWidgetIds = mergedWidgets.map((widget) => widget.id)
      const normalizedPages = normalizeHomeWidgetPages(nextPages, mergedWidgetIds)

      settings.appearance.customWidgets = mergedWidgets
      settings.appearance.homeWidgetPages = normalizedPages

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
    settings.appearance.homeWidgetPages = normalizeHomeWidgetPages(nextPages, currentCustomWidgetIds())
    return true
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

  const isAiAutomationEnabledForModule = (moduleKey) => {
    const moduleConfig = settings.aiAutomation.modules?.[moduleKey]
    return Boolean(settings.aiAutomation.masterEnabled && moduleConfig?.enabled)
  }

  const getAiAutomationModulePriority = (moduleKey) => {
    const moduleConfig = settings.aiAutomation.modules?.[moduleKey]
    return clamp(toInt(moduleConfig?.priority, 0), 0, 1000)
  }

  const tryAcquireAutoExecution = (moduleKey, reason = '') => {
    if (!isAiAutomationEnabledForModule(moduleKey)) return false

    if (!activeAutoExecution.module) {
      activeAutoExecution.module = moduleKey
      activeAutoExecution.startedAt = Date.now()
      activeAutoExecution.reason = typeof reason === 'string' ? reason : ''
      return true
    }

    if (activeAutoExecution.module === moduleKey) return true
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

  const clearApiReports = () => {
    apiReports.value = []
  }

  const lockPhone = () => {
    isLocked.value = true
  }

  const unlockPhone = () => {
    isLocked.value = false
  }

  const applyPersistedSnapshot = (persisted = {}) => {
    if (!persisted || typeof persisted !== 'object') return false

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

      if (typeof appearance.currentTheme === 'string') {
        settings.appearance.currentTheme = appearance.currentTheme
      }
      if (typeof appearance.wallpaper === 'string') {
        settings.appearance.wallpaper = appearance.wallpaper
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
      if (appearance.customVars && typeof appearance.customVars === 'object') {
        settings.appearance.customVars = { ...appearance.customVars }
      }
      if (typeof appearance.lockClockStyle === 'string') {
        settings.appearance.lockClockStyle = normalizeLockClockStyle(appearance.lockClockStyle)
      }

      settings.appearance.customWidgets = normalizeCustomWidgets(appearance.customWidgets)
      settings.appearance.homeWidgetPages = normalizeHomeWidgetPages(
        appearance.homeWidgetPages,
        currentCustomWidgetIds(),
      )
    }

    if (persisted.settings?.system && typeof persisted.settings.system === 'object') {
      Object.assign(settings.system, persisted.settings.system)
      settings.system.language = normalizeSystemLanguage(settings.system.language)
    }

    if (persisted.settings?.aiAutomation && typeof persisted.settings.aiAutomation === 'object') {
      settings.aiAutomation = normalizeAiAutomationSettings(persisted.settings.aiAutomation)
    } else {
      settings.aiAutomation = normalizeAiAutomationSettings(settings.aiAutomation)
    }

    if (persisted.user && typeof persisted.user === 'object') {
      Object.assign(user, persisted.user)
    }
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

    const hasTheme = availableThemes.value.some((theme) => theme.id === settings.appearance.currentTheme)
    if (!hasTheme) {
      settings.appearance.currentTheme = availableThemes.value[0]?.id || 'y2k'
      settings.appearance.wallpaper = availableThemes.value[0]?.wallpaper || settings.appearance.wallpaper
    }

    settings.appearance.customWidgets = normalizeCustomWidgets(settings.appearance.customWidgets)
    settings.appearance.homeWidgetPages = normalizeHomeWidgetPages(
      settings.appearance.homeWidgetPages,
      currentCustomWidgetIds(),
    )
    settings.appearance.lockClockStyle = normalizeLockClockStyle(settings.appearance.lockClockStyle)
    return true
  }

  const hydrateFromStorage = () => {
    const persisted = readPersistedState(SYSTEM_STORAGE_KEY, {
      version: SYSTEM_STORAGE_VERSION,
    })

    if (!persisted || typeof persisted !== 'object') return
    applyPersistedSnapshot(persisted)
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
            customVars: { ...settings.appearance.customVars },
            homeWidgetPages: settings.appearance.homeWidgetPages.map((page) => [...page]),
            customWidgets: settings.appearance.customWidgets.map((widget) => ({ ...widget })),
          },
          system: { ...settings.system },
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
        user: { ...user },
        notifications: notifications.value.map((note) => ({ ...note })),
        apiReports: apiReports.value.map((report) => ({ ...report })),
      },
      { version: SYSTEM_STORAGE_VERSION },
    )
  }

  const saveNow = () => {
    persistToStorage()
  }

  hydrateFromStorage()
  watch([settings, user, notifications, apiReports], persistToStorage, { deep: true })

  return {
    settings,
    user,
    notifications,
    apiReports,
    isLocked,
    activeAutoExecution,
    availableThemes,
    setTheme,
    cycleTheme,
    setCustomCss,
    setCustomVar,
    removeCustomVar,
    setHomeWidgetPages,
    resetHomeWidgetPages,
    addCustomWidget,
    updateCustomWidget,
    removeCustomWidget,
    placeCustomWidget,
    importCustomWidgets,
    placeBuiltInWidgetTile,
    addNotification,
    markNotificationRead,
    markAllNotificationsRead,
    removeNotification,
    clearNotifications,
    isAiAutomationEnabledForModule,
    getAiAutomationModulePriority,
    tryAcquireAutoExecution,
    releaseAutoExecution,
    addApiReport,
    clearApiReports,
    lockPhone,
    unlockPhone,
    saveNow,
    restoreFromBackup,
  }
})
