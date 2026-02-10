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
  ],
]

const HOME_TILE_ALIASES = {
  app_mail: 'app_network',
  app_maps: 'app_map',
  app_profile: 'app_chat',
  app_worldbook: 'app_files',
}

const VALID_HOME_TILE_IDS = [
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

const cloneDefaultWidgetPages = () => DEFAULT_WIDGET_PAGES.map((page) => [...page])

const normalizeHomeWidgetPages = (pages) => {
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
          if (!VALID_HOME_TILE_IDS.includes(tileId)) return false
          if (seen.has(tileId)) return false
          seen.add(tileId)
          return true
        }),
    )
    .filter((page) => page.length > 0)

  return normalized.length > 0 ? normalized : cloneDefaultWidgetPages()
}

const SYSTEM_STORAGE_KEY = 'store:system'
const SYSTEM_STORAGE_VERSION = 1

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
      '这是一个赛博朋克风格的近未来世界。科技高度发达但生活水平低劣。大公司控制着一切。霓虹灯闪烁在雨夜中。',
  })

  const notifications = ref([
    {
      id: 1,
      title: '系统',
      content: '系统已升级到 Open API 版本',
      icon: 'fas fa-exclamation-circle',
    },
  ])

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
    settings.appearance.homeWidgetPages = normalizeHomeWidgetPages(pages)
  }

  const resetHomeWidgetPages = () => {
    settings.appearance.homeWidgetPages = cloneDefaultWidgetPages()
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
      if (Array.isArray(appearance.homeWidgetPages)) {
        settings.appearance.homeWidgetPages = normalizeHomeWidgetPages(appearance.homeWidgetPages)
      }
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

    settings.appearance.homeWidgetPages = normalizeHomeWidgetPages(settings.appearance.homeWidgetPages)
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
    saveNow,
  }
})
