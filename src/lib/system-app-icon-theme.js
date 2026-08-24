import { projectUiAssetUrl } from './project-assets'

export const DEFAULT_SYSTEM_APP_ICON_THEME_ID = 'classic'

const bundledSystemAppIconUrl = (fileName = '') => {
  const normalizedFileName = String(fileName).trim().replace(/^\/+/, '')
  if (!normalizedFileName) return ''
  return projectUiAssetUrl(`shared/app-icons/cloud-pastel-animals-v1/${normalizedFileName}`)
}

export const SYSTEM_APP_ICON_THEME_OPTIONS = Object.freeze([
  {
    id: 'classic',
    labelZh: '经典系统',
    labelEn: 'System Classic',
    descriptionZh: '保留当前清晰、克制的系统 App 图标。',
    descriptionEn: 'Keeps the current clear and restrained system app icons.',
  },
  {
    id: 'soft-rounded',
    labelZh: '柔和圆角',
    labelEn: 'Soft Rounded',
    descriptionZh: '使用更饱满、轻松的图形与配色，但不改商业 App Logo。',
    descriptionEn: 'Uses fuller, friendlier shapes and colors without changing branded app logos.',
  },
  {
    id: 'cloud-pastel-animals',
    labelZh: '云朵动物',
    labelEn: 'Cloud Animals',
    descriptionZh: '12 个常用系统 App 使用动物图标，其余系统 App 暂沿用经典图标。',
    descriptionEn:
      'Uses animal icons for 12 frequently used system apps; other system apps keep their classic icons for now.',
  },
])

export const SYSTEM_APP_ICON_THEME_TARGET_IDS = Object.freeze([
  'app_network',
  'app_wallet',
  'app_gallery',
  'app_music',
  'app_camera',
  'app_themes',
  'app_widgets',
  'app_phone',
  'app_map',
  'app_weather',
  'app_calendar',
  'app_reminders',
  'app_stock',
  'app_contacts',
  'app_settings',
  'app_files',
  'app_assets',
  'app_control_center',
  'app_book',
  'app_store',
])

const THEME_IDS = new Set(SYSTEM_APP_ICON_THEME_OPTIONS.map((theme) => theme.id))
const TARGET_IDS = new Set(SYSTEM_APP_ICON_THEME_TARGET_IDS)

const SOFT_ROUNDED_APP_ICONS = Object.freeze({
  app_network: { icon: 'fas fa-globe', accent: 'cool' },
  app_wallet: { icon: 'fas fa-credit-card', accent: 'warm' },
  app_gallery: { icon: 'fas fa-image', accent: 'warm' },
  app_music: { icon: 'fas fa-compact-disc', accent: 'dark' },
  app_camera: { icon: 'fas fa-camera-retro', accent: 'dark' },
  app_themes: { icon: 'fas fa-droplet', accent: 'warm' },
  app_widgets: { icon: 'fas fa-grip', accent: 'light' },
  app_phone: { icon: 'fas fa-phone-volume', accent: 'default' },
  app_map: { icon: 'fas fa-location-dot', accent: 'warm' },
  app_weather: { icon: 'fas fa-sun', accent: 'light' },
  app_calendar: { icon: 'fas fa-calendar', accent: 'light' },
  app_reminders: { icon: 'fas fa-circle-check', accent: 'default' },
  app_stock: { icon: 'fas fa-arrow-trend-up', accent: 'cool' },
  app_contacts: { icon: 'fas fa-user-group', accent: 'light' },
  app_settings: { icon: 'fas fa-sliders', accent: 'dark' },
  app_files: { icon: 'fas fa-folder-open', accent: 'cool' },
  app_assets: { icon: 'fas fa-coins', accent: 'warm' },
  app_control_center: { icon: 'fas fa-wand-magic-sparkles', accent: 'dark' },
  app_book: { icon: 'fas fa-book', accent: 'cool' },
  app_store: { icon: 'fas fa-bag-shopping', accent: 'default' },
})

const CLOUD_PASTEL_ANIMAL_APP_ICONS = Object.freeze({
  app_network: {
    icon: 'fas fa-network-wired',
    accent: 'cool',
    imageUrl: bundledSystemAppIconUrl('network-wifi-clownfish.webp'),
  },
  app_wallet: {
    icon: 'fas fa-wallet',
    accent: 'warm',
    imageUrl: bundledSystemAppIconUrl('wallet-pouch-kangaroo.webp'),
  },
  app_gallery: {
    icon: 'fas fa-images',
    accent: 'light',
    imageUrl: bundledSystemAppIconUrl('gallery-photo-wing-butterfly.webp'),
  },
  app_music: {
    icon: 'fas fa-music',
    accent: 'warm',
    imageUrl: bundledSystemAppIconUrl('music-note-spout-whale.webp'),
  },
  app_themes: {
    icon: 'fas fa-palette',
    accent: 'default',
    imageUrl: bundledSystemAppIconUrl('appearance-crested-peacock.webp'),
  },
  app_widgets: {
    icon: 'fas fa-table-cells-large',
    accent: 'light',
    imageUrl: bundledSystemAppIconUrl('widgets-tile-shell-snail.webp'),
  },
  app_phone: {
    icon: 'fas fa-phone',
    accent: 'default',
    imageUrl: bundledSystemAppIconUrl('phone-lop-rabbit.webp'),
  },
  app_camera: {
    icon: 'fas fa-camera',
    accent: 'dark',
    imageUrl: bundledSystemAppIconUrl('camera-owl.webp'),
  },
  app_weather: {
    icon: 'fas fa-cloud-sun',
    accent: 'cool',
    imageUrl: bundledSystemAppIconUrl('weather-cloud-sheep.webp'),
  },
  app_calendar: {
    icon: 'fas fa-calendar-days',
    accent: 'light',
    imageUrl: bundledSystemAppIconUrl('calendar-bear.webp'),
  },
  app_map: {
    icon: 'fas fa-map-location-dot',
    accent: 'cool',
    imageUrl: bundledSystemAppIconUrl('map-turtle.webp'),
  },
  app_settings: {
    icon: 'fas fa-cog',
    accent: 'dark',
    imageUrl: bundledSystemAppIconUrl('settings-gear-beetle.webp'),
  },
})

const SYSTEM_APP_ICON_PACKS = Object.freeze({
  classic: Object.freeze({}),
  'soft-rounded': SOFT_ROUNDED_APP_ICONS,
  'cloud-pastel-animals': CLOUD_PASTEL_ANIMAL_APP_ICONS,
})

export const normalizeSystemAppIconThemeId = (
  value,
  fallback = DEFAULT_SYSTEM_APP_ICON_THEME_ID,
) => {
  const normalized = typeof value === 'string' ? value.trim() : ''
  return THEME_IDS.has(normalized) ? normalized : fallback
}

export const isSystemAppIconThemeTarget = (appId) => TARGET_IDS.has(appId)

export const resolveSystemAppIconThemeMeta = (themeId) =>
  SYSTEM_APP_ICON_THEME_OPTIONS.find(
    (theme) => theme.id === normalizeSystemAppIconThemeId(themeId),
  ) || SYSTEM_APP_ICON_THEME_OPTIONS[0]

export const resolveSystemAppIconThemeOverride = (appId, themeId) => {
  if (!isSystemAppIconThemeTarget(appId)) return null
  const normalizedThemeId = normalizeSystemAppIconThemeId(themeId)
  return SYSTEM_APP_ICON_PACKS[normalizedThemeId]?.[appId] || null
}
