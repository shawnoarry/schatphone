import {
  ASSETS_HOME_APP_ID,
  ASSETS_ROUTE,
  FOOD_DELIVERY_CATEGORY_ENTRIES,
  FOOD_DELIVERY_HOME_APP_ID,
  FOOD_DELIVERY_ROUTE,
  SHOPPING_CATEGORY_ENTRIES,
  SHOPPING_HOME_APP_ID,
  SHOPPING_ROUTE,
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
    childEntries: SHOPPING_CATEGORY_ENTRIES,
    presentation: HOME_FOLDER_PRESENTATION_DEFAULTS,
  }),
  [FOOD_DELIVERY_HOME_APP_ID]: Object.freeze({
    kind: HOME_FOLDER_TILE_KIND,
    label: 'Food',
    icon: 'fas fa-bowl-food',
    accent: 'warm',
    route: FOOD_DELIVERY_ROUTE,
    childEntries: FOOD_DELIVERY_CATEGORY_ENTRIES,
    presentation: {
      ...HOME_FOLDER_PRESENTATION_DEFAULTS,
      tint: 'glass-light',
    },
  }),
})

export const HOME_APP_REGISTRY_ADDITIONS = Object.freeze({
  [ASSETS_HOME_APP_ID]: Object.freeze({
    kind: 'app',
    icon: 'fas fa-vault',
    label: 'Assets',
    accent: 'cool',
    route: ASSETS_ROUTE,
  }),
})

export const HOME_PLANNED_TILE_IDS = Object.freeze([
  SHOPPING_HOME_APP_ID,
  FOOD_DELIVERY_HOME_APP_ID,
  ASSETS_HOME_APP_ID,
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
  if (!key) return route
  return {
    path: route,
    query: {
      category: key,
    },
  }
}
