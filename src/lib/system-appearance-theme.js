import {
  DEFAULT_SYSTEM_APP_ICON_THEME_ID,
  normalizeSystemAppIconThemeId,
} from './system-app-icon-theme'
import { projectUiAssetUrl } from './project-assets'

export const DEFAULT_APPEARANCE_COLOR_MODE = 'day'
export const DEFAULT_SYSTEM_APPEARANCE_THEME_ID = 'classic'
export const DEFAULT_APPEARANCE_STYLE_KIT_ID = 'system-classic'

const bundledAppearanceAssetUrl = (path = '') => {
  const normalizedPath = String(path).trim().replace(/^\/+/, '')
  if (!normalizedPath) return ''
  return projectUiAssetUrl(normalizedPath.replace(/^images\/ui-assets\//, ''))
}

export const APPEARANCE_COLOR_MODE_OPTIONS = Object.freeze([
  {
    id: 'day',
    legacyThemeId: 'default',
    labelZh: '白天',
    labelEn: 'Day',
    preview: 'linear-gradient(180deg, #f7f8fa 0%, #e2e8ed 52%, #aab8c3 100%)',
    darkText: true,
  },
  {
    id: 'night',
    legacyThemeId: 'zen',
    labelZh: '黑夜',
    labelEn: 'Night',
    preview: 'linear-gradient(180deg, #25303a 0%, #151c24 54%, #0d1218 100%)',
    darkText: false,
  },
])

export const SYSTEM_APPEARANCE_THEME_OPTIONS = Object.freeze([
  {
    id: 'classic',
    labelZh: '系统经典',
    labelEn: 'System Classic',
    descriptionZh: '保留当前克制、清晰的系统材质与配色。',
    descriptionEn: 'Keeps the current restrained and clear system materials and colors.',
    previews: Object.freeze({
      day: 'linear-gradient(145deg, #f7f9fa 0%, #dce4e8 52%, #91a2ad 100%)',
      night: 'linear-gradient(145deg, #2b3741 0%, #182129 54%, #0d1218 100%)',
    }),
    wallpapers: Object.freeze({
      day: '',
      night: '',
    }),
  },
  {
    id: 'cloud-pastel',
    labelZh: '云朵粉彩',
    labelEn: 'Cloud Pastel',
    descriptionZh: '雾蓝、柔绿与浅紫组成的轻盈系统材质，日夜版本保持同一气质。',
    descriptionEn: 'An airy system material built from mist blue, soft green, and pale lavender.',
    previews: Object.freeze({
      day: 'linear-gradient(145deg, #edf4f6 0%, #d5e5de 48%, #d8d1e7 100%)',
      night: 'linear-gradient(145deg, #384258 0%, #252e40 52%, #171f2d 100%)',
    }),
    wallpapers: Object.freeze({
      day: bundledAppearanceAssetUrl(
        'images/ui-assets/shared/backgrounds/cloud-pastel-day-v1.webp',
      ),
      night: bundledAppearanceAssetUrl(
        'images/ui-assets/shared/backgrounds/cloud-pastel-night-v1.webp',
      ),
    }),
  },
])

export const APPEARANCE_STYLE_KIT_OPTIONS = Object.freeze([
  {
    id: 'system-classic',
    labelZh: '系统经典',
    labelEn: 'System Classic',
    descriptionZh: '系统经典主题、经典系统 App 图标与推荐壁纸。',
    descriptionEn: 'System Classic theme, classic system app icons, and recommended wallpaper.',
    systemTheme: DEFAULT_SYSTEM_APPEARANCE_THEME_ID,
    systemAppIconTheme: DEFAULT_SYSTEM_APP_ICON_THEME_ID,
  },
  {
    id: 'cloud-pastel',
    labelZh: '云朵粉彩',
    labelEn: 'Cloud Pastel',
    descriptionZh: '云朵粉彩界面、云朵动物系统 App 图标与日夜推荐壁纸。',
    descriptionEn:
      'Cloud Pastel surfaces, Cloud Animals system app icons, and day/night recommended wallpapers.',
    systemTheme: 'cloud-pastel',
    systemAppIconTheme: 'cloud-pastel-animals',
  },
])

const COLOR_MODE_IDS = new Set(APPEARANCE_COLOR_MODE_OPTIONS.map((option) => option.id))
const LEGACY_THEME_TO_COLOR_MODE = Object.freeze({
  default: 'day',
  zen: 'night',
  y2k: 'day',
})
const SYSTEM_THEME_IDS = new Set(SYSTEM_APPEARANCE_THEME_OPTIONS.map((theme) => theme.id))
const STYLE_KIT_IDS = new Set(APPEARANCE_STYLE_KIT_OPTIONS.map((kit) => kit.id))

export const normalizeAppearanceColorMode = (
  value,
  fallback = DEFAULT_APPEARANCE_COLOR_MODE,
) => {
  const normalized = typeof value === 'string' ? value.trim() : ''
  const migrated = LEGACY_THEME_TO_COLOR_MODE[normalized] || normalized
  return COLOR_MODE_IDS.has(migrated) ? migrated : fallback
}

export const appearanceColorModeToLegacyThemeId = (value) =>
  APPEARANCE_COLOR_MODE_OPTIONS.find(
    (option) => option.id === normalizeAppearanceColorMode(value),
  )?.legacyThemeId || 'default'

export const normalizeSystemAppearanceThemeId = (
  value,
  fallback = DEFAULT_SYSTEM_APPEARANCE_THEME_ID,
) => {
  const normalized = typeof value === 'string' ? value.trim() : ''
  return SYSTEM_THEME_IDS.has(normalized) ? normalized : fallback
}

export const resolveSystemAppearanceThemeMeta = (themeId) =>
  SYSTEM_APPEARANCE_THEME_OPTIONS.find(
    (theme) => theme.id === normalizeSystemAppearanceThemeId(themeId),
  ) || SYSTEM_APPEARANCE_THEME_OPTIONS[0]

export const resolveSystemAppearanceThemeWallpaper = (themeId, colorMode) => {
  const theme = resolveSystemAppearanceThemeMeta(themeId)
  const mode = normalizeAppearanceColorMode(colorMode)
  return theme?.wallpapers?.[mode] || ''
}

export const normalizeAppearanceStyleKitId = (
  value,
  fallback = DEFAULT_APPEARANCE_STYLE_KIT_ID,
) => {
  const normalized = typeof value === 'string' ? value.trim() : ''
  if (!normalized && fallback === '') return ''
  return STYLE_KIT_IDS.has(normalized) ? normalized : fallback
}

export const resolveAppearanceStyleKitMeta = (kitId) =>
  APPEARANCE_STYLE_KIT_OPTIONS.find(
    (kit) => kit.id === normalizeAppearanceStyleKitId(kitId),
  ) || APPEARANCE_STYLE_KIT_OPTIONS[0]

export const resolveAppearanceStyleKitStatus = (appearance = {}) => {
  const source = appearance && typeof appearance === 'object' ? appearance : {}
  const kitId = normalizeAppearanceStyleKitId(source.styleKitId, '')
  if (!kitId) return null

  const kit = resolveAppearanceStyleKitMeta(kitId)
  const systemTheme = normalizeSystemAppearanceThemeId(source.systemTheme)
  const systemAppIconTheme = normalizeSystemAppIconThemeId(source.systemAppIconTheme)
  const wallpaperCustomized = source.wallpaperMode && source.wallpaperMode !== 'theme'

  return {
    kit,
    customized:
      systemTheme !== kit.systemTheme ||
      systemAppIconTheme !== kit.systemAppIconTheme ||
      Boolean(wallpaperCustomized),
  }
}
