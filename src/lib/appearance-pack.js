import { normalizeAppIconOverrides } from './app-icon-presentation'
import { normalizeScopedCustomCss } from './appearance-scoped-css'

export const APPEARANCE_PACK_KIND = 'schatphone.appearance-pack'
export const APPEARANCE_PACK_VERSION = 1

const APPEARANCE_PACK_FIELD_KEYS = Object.freeze([
  'currentTheme',
  'wallpaperMode',
  'wallpaperAssetId',
  'wallpaper',
  'showStatusBar',
  'hapticFeedbackEnabled',
  'customCss',
  'scopedCustomCss',
  'customVars',
  'appIconOverrides',
  'lockClockStyle',
])

const normalizeText = (value, fallback = '', maxLength = 500) => {
  const text = typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : ''
  if (!text) return fallback
  return text.slice(0, maxLength)
}

const normalizeLooseText = (value, fallback = '', maxLength = 20_000) => {
  if (typeof value !== 'string') return fallback
  return value.slice(0, maxLength)
}

const normalizeBoolean = (value, fallback = true) =>
  typeof value === 'boolean' ? value : fallback

const normalizeStringRecord = (value = {}) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return Object.fromEntries(
    Object.entries(value)
      .map(([key, rawValue]) => [
        normalizeText(key, '', 120),
        typeof rawValue === 'string' ? rawValue.slice(0, 2000) : String(rawValue ?? '').slice(0, 2000),
      ])
      .filter(([key]) => key),
  )
}

export const normalizeAppearancePackAppearance = (appearance = {}) => {
  const source = appearance && typeof appearance === 'object' ? appearance : {}
  return {
    currentTheme: normalizeText(source.currentTheme, 'default', 80),
    wallpaperMode: normalizeText(source.wallpaperMode, 'theme', 40),
    wallpaperAssetId: normalizeText(source.wallpaperAssetId, '', 160),
    wallpaper: normalizeLooseText(source.wallpaper, '', 20_000),
    showStatusBar: normalizeBoolean(source.showStatusBar, true),
    hapticFeedbackEnabled: normalizeBoolean(source.hapticFeedbackEnabled, true),
    customCss: normalizeLooseText(source.customCss, '', 50_000),
    scopedCustomCss: normalizeScopedCustomCss(source.scopedCustomCss),
    customVars: normalizeStringRecord(source.customVars),
    appIconOverrides: normalizeAppIconOverrides(source.appIconOverrides),
    lockClockStyle: normalizeText(source.lockClockStyle, 'classic', 40),
  }
}

export const buildAppearancePack = (appearance = {}, options = {}) => ({
  kind: APPEARANCE_PACK_KIND,
  version: APPEARANCE_PACK_VERSION,
  name: normalizeText(options.name, 'SchatPhone appearance pack', 120),
  description: normalizeText(options.description, '', 500),
  exportedAt: Number.isFinite(Number(options.exportedAt)) ? Number(options.exportedAt) : Date.now(),
  appearance: normalizeAppearancePackAppearance(appearance),
})

export const normalizeAppearancePack = (payload = {}) => {
  const source = payload && typeof payload === 'object' ? payload : null
  if (!source) {
    return { ok: false, reason: 'invalid_payload', pack: null }
  }

  const appearanceSource =
    source.kind === APPEARANCE_PACK_KIND && source.appearance && typeof source.appearance === 'object'
      ? source.appearance
      : source.appearance && typeof source.appearance === 'object'
        ? source.appearance
        : APPEARANCE_PACK_FIELD_KEYS.some((key) => Object.prototype.hasOwnProperty.call(source, key))
          ? source
          : null

  if (!appearanceSource) {
    return { ok: false, reason: 'missing_appearance', pack: null }
  }

  return {
    ok: true,
    reason: 'ok',
    pack: {
      kind: APPEARANCE_PACK_KIND,
      version: APPEARANCE_PACK_VERSION,
      name: normalizeText(source.name, 'Imported appearance pack', 120),
      description: normalizeText(source.description, '', 500),
      exportedAt: Number.isFinite(Number(source.exportedAt)) ? Number(source.exportedAt) : 0,
      appearance: normalizeAppearancePackAppearance(appearanceSource),
    },
  }
}

export const mergeAppearancePackIntoAppearance = (currentAppearance = {}, packPayload = {}) => {
  const normalized = normalizeAppearancePack(packPayload)
  if (!normalized.ok) return { ok: false, reason: normalized.reason, appearance: currentAppearance }
  return {
    ok: true,
    reason: 'merged',
    pack: normalized.pack,
    appearance: {
      ...(currentAppearance && typeof currentAppearance === 'object' ? currentAppearance : {}),
      ...normalized.pack.appearance,
      scopedCustomCss: normalizeScopedCustomCss(normalized.pack.appearance.scopedCustomCss),
      customVars: { ...normalized.pack.appearance.customVars },
      appIconOverrides: normalizeAppIconOverrides(normalized.pack.appearance.appIconOverrides),
    },
  }
}
