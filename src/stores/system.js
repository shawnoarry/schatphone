import { defineStore } from 'pinia'
import { reactive, ref, watch } from 'vue'
import { readPersistedState, writePersistedState } from '../lib/persistence'

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
const CUSTOM_WIDGET_SIZES = ['1x1', '2x1', '2x2', '4x2', '4x3']

const SYSTEM_STORAGE_KEY = 'store:system'
const SYSTEM_STORAGE_VERSION = 1

const cloneDefaultWidgetPages = () => DEFAULT_WIDGET_PAGES.map((page) => [...page])

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
      customCss: '',
      customVars: {},
      homeWidgetPages: cloneDefaultWidgetPages(),
      customWidgets: [],
    },
    system: {
      language: 'zh-CN',
      timezone: 'Asia/Shanghai',
      notifications: true,
    },
  })

  const user = reactive({
    name: 'V',
    gender: '',
    birthday: '',
    occupation: '',
    relationship: '',
    bio: '夜之城的自由佣兵。',
    avatar: '',
    worldBook:
      '这是一个赛博朋克风格的近未来世界。科技高度发达，但生活水平差距巨大。大型公司控制着资源与秩序。',
  })

  const notifications = ref([
    {
      id: 1,
      title: '系统',
      content: '系统已升级到 Open API 版本',
      icon: 'fas fa-exclamation-circle',
    },
  ])

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

  const importCustomWidgets = (importPayload, pageIndex = 0) => {
    let parsed = importPayload
    if (typeof importPayload === 'string') {
      try {
        parsed = JSON.parse(importPayload)
      } catch {
        return 0
      }
    }

    if (!Array.isArray(parsed)) return 0

    let count = 0
    parsed.forEach((item) => {
      if (!item || typeof item !== 'object') return
      addCustomWidget({
        name: item.name,
        size: item.size,
        code: item.code,
        pageIndex,
      })
      count += 1
    })

    return count
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

  const hydrateFromStorage = () => {
    const persisted = readPersistedState(SYSTEM_STORAGE_KEY, {
      version: SYSTEM_STORAGE_VERSION,
    })

    if (!persisted || typeof persisted !== 'object') return

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
      if (typeof appearance.customCss === 'string') {
        settings.appearance.customCss = appearance.customCss
      }
      if (appearance.customVars && typeof appearance.customVars === 'object') {
        settings.appearance.customVars = { ...appearance.customVars }
      }

      settings.appearance.customWidgets = normalizeCustomWidgets(appearance.customWidgets)
      settings.appearance.homeWidgetPages = normalizeHomeWidgetPages(
        appearance.homeWidgetPages,
        currentCustomWidgetIds(),
      )
    }

    if (persisted.settings?.system && typeof persisted.settings.system === 'object') {
      Object.assign(settings.system, persisted.settings.system)
    }

    if (persisted.user && typeof persisted.user === 'object') {
      Object.assign(user, persisted.user)
    }

    if (Array.isArray(persisted.notifications)) {
      notifications.value = persisted.notifications.map((note) => ({ ...note }))
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
        },
        user: { ...user },
        notifications: notifications.value.map((note) => ({ ...note })),
      },
      { version: SYSTEM_STORAGE_VERSION },
    )
  }

  const saveNow = () => {
    persistToStorage()
  }

  hydrateFromStorage()
  watch([settings, user, notifications], persistToStorage, { deep: true })

  return {
    settings,
    user,
    notifications,
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
    saveNow,
  }
})
