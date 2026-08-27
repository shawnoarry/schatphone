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
  {
    id: 'chromatic-glass',
    labelZh: '彩光玻璃',
    labelEn: 'Chromatic Glass',
    descriptionZh: '保持透明主体，只让粉、蓝、薄荷与蜜桃色停留在边缘折射、内高光和轻微阴影。',
    descriptionEn:
      'Keeps the glass body clear while pastel pink, blue, mint, and peach stay in refraction, highlights, and soft shadows.',
    previews: Object.freeze({
      day: 'linear-gradient(145deg, #eef3fa 0%, #f6eaf0 42%, #e7f2ed 70%, #f5e4d7 100%)',
      night: 'linear-gradient(145deg, #273146 0%, #242535 44%, #203a3b 70%, #3a2b31 100%)',
    }),
    wallpapers: Object.freeze({
      day: '',
      night: '',
    }),
  },
  {
    id: 'moonlit-journal',
    labelZh: '月光手账',
    labelEn: 'Moonlit Journal',
    descriptionZh: '暖白纸页、雾粉与浅灰褐组成的月光手账材质；夜间仍保持柔和的浅色纸感。',
    descriptionEn:
      'A moonlit journal material in warm white paper, misty blush, and pale taupe; night mode stays softly paper-light.',
    previews: Object.freeze({
      day: 'linear-gradient(145deg, #fbf8f5 0%, #f2ece8 52%, #e8ddd7 100%)',
      night: 'linear-gradient(145deg, #f2eeeb 0%, #e8e1dd 54%, #dcd1cb 100%)',
    }),
    wallpapers: Object.freeze({
      day: '',
      night: '',
    }),
  },
  {
    id: 'sticker-pop',
    labelZh: '贴纸涂鸦',
    labelEn: 'Sticker Pop',
    descriptionZh: '奶油纸底、粗黑圆线与柔和彩色块组成的手绘贴纸系统；夜间切换为暖墨底与浅色描边。',
    descriptionEn:
      'A hand-drawn sticker system with creamy paper, bold rounded ink, and softened color blocks; night mode uses warm ink and pale outlines.',
    previews: Object.freeze({
      day: 'linear-gradient(145deg, #fffaf1 0%, #f5d477 42%, #ef8c91 68%, #86b99a 100%)',
      night: 'linear-gradient(145deg, #343338 0%, #514b55 44%, #705557 70%, #4d6658 100%)',
    }),
    wallpapers: Object.freeze({
      day: '',
      night: '',
    }),
  },
  {
    id: 'cream-shell',
    labelZh: '奶油软壳',
    labelEn: 'Cream Shell',
    descriptionZh: '以奶油桃白、象牙白与平面圆角色块组成统一界面；暖灰只用于文字和必要轮廓。',
    descriptionEn:
      'A light, near-flat system of cream and ivory rounded blocks, using warm neutrals only for text and essential contrast.',
    previews: Object.freeze({
      day: 'linear-gradient(145deg, #fff5ec 0%, #fcead9 54%, #f1d5bd 100%)',
      night: 'linear-gradient(145deg, #f9e9dc 0%, #efd9c6 56%, #dfc3ac 100%)',
    }),
    wallpapers: Object.freeze({
      day: `${bundledAppearanceAssetUrl(
        'images/ui-assets/shared/backgrounds/cream-shell-soft-haze-v2.webp',
      )}?v=20260827-2`,
      night: `${bundledAppearanceAssetUrl(
        'images/ui-assets/shared/backgrounds/cream-shell-soft-haze-v2.webp',
      )}?v=20260827-2`,
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
  {
    id: 'chromatic-glass',
    labelZh: '彩光玻璃',
    labelEn: 'Chromatic Glass',
    descriptionZh: '彩光玻璃界面、简约线形玻璃图标与可选配套组件；颜色停留在边缘、高光和轻微环境光。',
    descriptionEn:
      'Chromatic glass surfaces, minimal line glyphs, and optional companion widgets; color stays in the edges, highlights, and ambient light.',
    systemTheme: 'chromatic-glass',
    systemAppIconTheme: 'chromatic-glass',
    companionWidgetCollectionId: 'liquid-prism',
  },
  {
    id: 'moonlit-journal',
    labelZh: '月光手账',
    labelEn: 'Moonlit Journal',
    descriptionZh: '月光手账界面、经典系统 App 图标与复古纸感配色。',
    descriptionEn:
      'Moonlit Journal surfaces, classic system app icons, and vintage paper tones.',
    systemTheme: 'moonlit-journal',
    systemAppIconTheme: DEFAULT_SYSTEM_APP_ICON_THEME_ID,
  },
  {
    id: 'sticker-pop',
    labelZh: '贴纸涂鸦',
    labelEn: 'Sticker Pop',
    descriptionZh: '贴纸涂鸦界面、粗线系统 App 图标与奶油纸感背景。',
    descriptionEn:
      'Sticker Pop surfaces, bold-outline system app icons, and a creamy paper-like background.',
    systemTheme: 'sticker-pop',
    systemAppIconTheme: 'sticker-pop',
  },
  {
    id: 'cream-shell',
    labelZh: '奶油软壳',
    labelEn: 'Cream Shell',
    descriptionZh: '奶油桃白平面界面、细线系统 App 图标、内置柔光壁纸与 5 个可选配套组件；仍可保留用户自己的壁纸。',
    descriptionEn:
      'Near-flat cream-peach surfaces, fine-line system app icons, an optional built-in wallpaper, and five companion widgets while preserving personal wallpaper when preferred.',
    systemTheme: 'cream-shell',
    systemAppIconTheme: 'cream-shell',
    companionWidgetCollectionId: 'cream-shell',
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
const LEGACY_SYSTEM_THEME_IDS = Object.freeze({
  'liquid-prism': 'chromatic-glass',
})
const LEGACY_STYLE_KIT_IDS = Object.freeze({
  'liquid-prism': 'chromatic-glass',
})

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
  const migrated = LEGACY_SYSTEM_THEME_IDS[normalized] || normalized
  return SYSTEM_THEME_IDS.has(migrated) ? migrated : fallback
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
  const migrated = LEGACY_STYLE_KIT_IDS[normalized] || normalized
  return STYLE_KIT_IDS.has(migrated) ? migrated : fallback
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
