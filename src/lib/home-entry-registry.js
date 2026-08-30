import {
  AGENDA_JOURNEY_HOME_APP_ID,
  AGENDA_JOURNEY_ROUTE,
  ASSETS_HOME_APP_ID,
  ASSETS_ROUTE,
  BROWSER_HOME_APP_ID,
  BROWSER_ROUTE,
  CAMERA_HOME_APP_ID,
  CAMERA_ROUTE,
  CHRONICLE_HOME_APP_ID,
  CHRONICLE_ROUTE,
  CONTROL_CENTER_HOME_APP_ID,
  CONTROL_CENTER_ROUTE,
  COMMUNITY_HOME_APP_ID,
  COMMUNITY_ROUTE,
  FOOD_DELIVERY_HOME_APP_ID,
  FOOD_DELIVERY_ROUTE,
  HEALTHCARE_HOME_APP_ID,
  HEALTHCARE_ROUTE,
  HOUSING_HOME_APP_ID,
  HOUSING_ROUTE,
  MAIL_HOME_APP_ID,
  MAIL_ROUTE,
  MUSIC_HOME_APP_ID,
  MUSIC_ROUTE,
  SHOPPING_HOME_APP_ID,
  SHOPPING_ROUTE,
  WEATHER_HOME_APP_ID,
  WEATHER_ROUTE,
} from './planned-module-registry'

export const HOME_FOLDER_TILE_KIND = 'folder'

export const HOME_FOLDER_PRESENTATION_DEFAULTS = Object.freeze({
  previewLimit: 4,
  previewDensity: 'grid-4',
  iconMask: 'rounded-square',
  tint: 'glass-warm',
  openAnimation: 'ios-folder-zoom',
  panelBackdrop: 'blur',
})

export const HOME_FOLDER_REGISTRY = Object.freeze({
  [SHOPPING_HOME_APP_ID]: Object.freeze({
    kind: HOME_FOLDER_TILE_KIND,
    label: 'Shopping',
    icon: 'fas fa-bag-shopping',
    accent: 'warm',
    route: SHOPPING_ROUTE,
    childEntries: [],
    presentation: HOME_FOLDER_PRESENTATION_DEFAULTS,
  }),
  [FOOD_DELIVERY_HOME_APP_ID]: Object.freeze({
    kind: HOME_FOLDER_TILE_KIND,
    label: 'Food',
    icon: 'fas fa-bowl-food',
    accent: 'warm',
    route: FOOD_DELIVERY_ROUTE,
    childEntries: [],
    presentation: {
      ...HOME_FOLDER_PRESENTATION_DEFAULTS,
      tint: 'glass-light',
    },
  }),
})

export const HOME_APP_REGISTRY_ADDITIONS = Object.freeze({
  [AGENDA_JOURNEY_HOME_APP_ID]: Object.freeze({
    kind: 'app',
    icon: 'fas fa-route',
    label: 'Agenda Journey',
    accent: 'cool',
    route: AGENDA_JOURNEY_ROUTE,
  }),
  [CHRONICLE_HOME_APP_ID]: Object.freeze({
    kind: 'app',
    icon: 'fas fa-book-open',
    label: 'Chronicle',
    accent: 'warm',
    route: CHRONICLE_ROUTE,
  }),
  [MUSIC_HOME_APP_ID]: Object.freeze({
    kind: 'app',
    icon: 'fas fa-music',
    label: 'Music',
    accent: 'warm',
    route: MUSIC_ROUTE,
  }),
  [WEATHER_HOME_APP_ID]: Object.freeze({
    kind: 'app',
    icon: 'fas fa-cloud-sun',
    label: 'Weather',
    accent: 'cool',
    route: WEATHER_ROUTE,
  }),
  [CAMERA_HOME_APP_ID]: Object.freeze({
    kind: 'app',
    icon: 'fas fa-camera',
    label: 'Camera',
    accent: 'dark',
    route: CAMERA_ROUTE,
  }),
  [ASSETS_HOME_APP_ID]: Object.freeze({
    kind: 'app',
    icon: 'fas fa-vault',
    label: 'Assets',
    accent: 'cool',
    route: ASSETS_ROUTE,
  }),
  [CONTROL_CENTER_HOME_APP_ID]: Object.freeze({
    kind: 'app',
    icon: 'fas fa-wand-magic-sparkles',
    label: 'World Hub',
    accent: 'dark',
    route: CONTROL_CENTER_ROUTE,
  }),
  [MAIL_HOME_APP_ID]: Object.freeze({
    kind: 'app',
    icon: 'fas fa-envelope-open-text',
    label: 'Mail',
    accent: 'cool',
    route: MAIL_ROUTE,
  }),
  [BROWSER_HOME_APP_ID]: Object.freeze({
    kind: 'app',
    icon: 'fas fa-compass',
    label: 'Browser',
    accent: 'cool',
    route: BROWSER_ROUTE,
  }),
  [COMMUNITY_HOME_APP_ID]: Object.freeze({
    kind: 'app',
    icon: 'fas fa-wave-square',
    label: 'Ripple',
    accent: 'warm',
    route: COMMUNITY_ROUTE,
  }),
  [HEALTHCARE_HOME_APP_ID]: Object.freeze({
    kind: 'app',
    icon: 'fas fa-heart-pulse',
    label: 'Ondam Care',
    accent: 'cool',
    route: HEALTHCARE_ROUTE,
  }),
  [HOUSING_HOME_APP_ID]: Object.freeze({
    kind: 'app',
    icon: 'fas fa-house-chimney-window',
    label: 'Jari',
    accent: 'warm',
    route: HOUSING_ROUTE,
  }),
})

export const HOME_PLANNED_TILE_IDS = Object.freeze([
  AGENDA_JOURNEY_HOME_APP_ID,
  CHRONICLE_HOME_APP_ID,
  MUSIC_HOME_APP_ID,
  WEATHER_HOME_APP_ID,
  CAMERA_HOME_APP_ID,
  SHOPPING_HOME_APP_ID,
  FOOD_DELIVERY_HOME_APP_ID,
  ASSETS_HOME_APP_ID,
  CONTROL_CENTER_HOME_APP_ID,
  MAIL_HOME_APP_ID,
  BROWSER_HOME_APP_ID,
  COMMUNITY_HOME_APP_ID,
  HEALTHCARE_HOME_APP_ID,
  HOUSING_HOME_APP_ID,
])

export const HOME_PLANNED_LOCKED_TILE_IDS = Object.freeze([
  SHOPPING_HOME_APP_ID,
  FOOD_DELIVERY_HOME_APP_ID,
  ASSETS_HOME_APP_ID,
])

export const resolveHomeFolderPresentation = (folderMeta = {}) => ({
  ...HOME_FOLDER_PRESENTATION_DEFAULTS,
  ...(folderMeta.presentation && typeof folderMeta.presentation === 'object'
    ? folderMeta.presentation
    : {}),
})

export const resolveHomeFolderChildRoute = (entry = {}) => {
  const route = typeof entry.route === 'string' && entry.route.trim() ? entry.route.trim() : ''
  if (!route) return ''
  const key = typeof entry.key === 'string' ? entry.key.trim() : ''
  const folderQuery = entry.folderQuery && typeof entry.folderQuery === 'object' ? entry.folderQuery : null
  if (folderQuery) {
    return {
      path: route,
      query: {
        ...folderQuery,
      },
    }
  }
  if (!key) return route
  return {
    path: route,
    query: {
      category: key,
    },
  }
}
