import { normalizeScopeToken } from './app-shell-scope'
import { scopeCssToSelector } from './appearance-scoped-css'

const MAX_APP_SKIN_CSS_CHARS = 20000

export const DEFAULT_APP_SKIN_PRESET_ID = 'system_default'

export const APP_SKIN_TARGETS = Object.freeze([
  Object.freeze({ appId: 'app_store', scope: 'app_store', labelZh: '应用商城', labelEn: 'App Store' }),
  Object.freeze({ appId: 'app_network', scope: 'network', labelZh: '网络', labelEn: 'Network' }),
  Object.freeze({ appId: 'app_settings', scope: 'settings', labelZh: '设置', labelEn: 'Settings' }),
  Object.freeze({ appId: 'app_control_center', scope: 'control_center', labelZh: '世界中枢', labelEn: 'World Hub' }),
  Object.freeze({ appId: 'app_book', scope: 'book', labelZh: '文本库', labelEn: 'Book' }),
  Object.freeze({ appId: 'app_contacts', scope: 'contacts', labelZh: '联系人', labelEn: 'Contacts' }),
  Object.freeze({ appId: 'app_phone', scope: 'phone', labelZh: '电话', labelEn: 'Phone' }),
  Object.freeze({ appId: 'app_gallery', scope: 'gallery', labelZh: '相册', labelEn: 'Photos' }),
  Object.freeze({ appId: 'app_map', scope: 'map', labelZh: '地图', labelEn: 'Map' }),
  Object.freeze({ appId: 'app_calendar', scope: 'calendar', labelZh: '日历', labelEn: 'Calendar' }),
  Object.freeze({ appId: 'app_reminders', scope: 'reminders', labelZh: '提醒事项', labelEn: 'Reminders' }),
  Object.freeze({ appId: 'app_wallet', scope: 'wallet', labelZh: '钱包', labelEn: 'Wallet' }),
  Object.freeze({ appId: 'app_stock', scope: 'stock', labelZh: '股票', labelEn: 'Stock' }),
  Object.freeze({ appId: 'app_shopping', scope: 'shopping', labelZh: '购物', labelEn: 'Shopping' }),
  Object.freeze({ appId: 'app_food_delivery', scope: 'food_delivery', labelZh: '外卖', labelEn: 'Food Delivery' }),
  Object.freeze({ appId: 'app_assets', scope: 'assets', labelZh: '资产', labelEn: 'Assets' }),
  Object.freeze({ appId: 'app_themes', scope: 'appearance', labelZh: '外观', labelEn: 'Appearance' }),
  Object.freeze({ appId: 'app_widgets', scope: 'widgets', labelZh: '组件', labelEn: 'Widgets' }),
])

export const APP_SKIN_PRESETS = Object.freeze([
  Object.freeze({
    id: DEFAULT_APP_SKIN_PRESET_ID,
    labelZh: '跟随系统',
    labelEn: 'Follow System',
    css: '',
  }),
  Object.freeze({
    id: 'market_fresh',
    labelZh: '鲜活市集',
    labelEn: 'Market Fresh',
    css: `
:scope {
  --app-skin-accent: #16a34a;
  --app-skin-accent-soft: color-mix(in srgb, #16a34a 18%, transparent);
}
.store-card,
.restaurant-card,
.order-card {
  border-color: color-mix(in srgb, var(--app-skin-accent) 22%, var(--system-subtle-border));
}
`,
  }),
  Object.freeze({
    id: 'catalog_clean',
    labelZh: '清爽目录',
    labelEn: 'Catalog Clean',
    css: `
:scope {
  --app-skin-accent: #2563eb;
  --app-skin-accent-soft: color-mix(in srgb, #2563eb 14%, transparent);
}
.shop-card,
.product-card,
.commerce-card {
  border-color: color-mix(in srgb, var(--app-skin-accent) 18%, var(--system-subtle-border));
}
`,
  }),
  Object.freeze({
    id: 'night_service',
    labelZh: '夜间服务',
    labelEn: 'Night Service',
    css: `
:scope {
  --app-skin-accent: #8b5cf6;
  --app-skin-accent-soft: color-mix(in srgb, #8b5cf6 18%, transparent);
}
.store-card,
.shop-card,
.restaurant-card,
.order-card {
  border-color: color-mix(in srgb, var(--app-skin-accent) 24%, var(--system-subtle-border));
}
`,
  }),
])

export const DEFAULT_APP_SKIN_SETTING = Object.freeze({
  presetId: DEFAULT_APP_SKIN_PRESET_ID,
  customCssEnabled: false,
  customCss: '',
})

const APP_SKIN_TARGETS_BY_APP_ID = new Map(APP_SKIN_TARGETS.map((target) => [target.appId, target]))
const APP_SKIN_TARGETS_BY_SCOPE = new Map(APP_SKIN_TARGETS.map((target) => [target.scope, target]))
const APP_SKIN_PRESETS_BY_ID = new Map(APP_SKIN_PRESETS.map((preset) => [preset.id, preset]))

const normalizeText = (value, fallback = '', maxLength = 120) => {
  const text = typeof value === 'string' ? value.trim() : ''
  return (text || fallback).slice(0, maxLength)
}

const normalizeCssText = (value) =>
  typeof value === 'string' ? value.slice(0, MAX_APP_SKIN_CSS_CHARS) : ''

export const resolveAppSkinTargetForAppId = (appId = '') => {
  const normalizedId = normalizeText(appId, '', 120)
  return APP_SKIN_TARGETS_BY_APP_ID.get(normalizedId) || null
}

export const resolveAppSkinTargetForScope = (scope = '') => {
  const normalizedScope = normalizeScopeToken(scope, '')
  return APP_SKIN_TARGETS_BY_SCOPE.get(normalizedScope) || null
}

export const resolveAppSkinPreset = (presetId = '') => {
  const normalizedId = normalizeText(presetId, DEFAULT_APP_SKIN_PRESET_ID, 120)
  return APP_SKIN_PRESETS_BY_ID.get(normalizedId) || APP_SKIN_PRESETS_BY_ID.get(DEFAULT_APP_SKIN_PRESET_ID)
}

export const resolveAppSkinPresetLabel = (presetId = '', locale = 'en-US') => {
  const preset = resolveAppSkinPreset(presetId)
  const language = typeof locale === 'string' ? locale.toLowerCase() : ''
  return language.startsWith('zh') ? preset.labelZh : preset.labelEn
}

export const normalizeAppSkinSetting = (input = {}) => {
  const source = input && typeof input === 'object' ? input : {}
  const preset = resolveAppSkinPreset(source.presetId)
  return {
    presetId: preset.id,
    customCssEnabled: source.customCssEnabled === true,
    customCss: normalizeCssText(source.customCss),
  }
}

export const normalizeAppSkinSettings = (input = {}) => {
  const source = input && typeof input === 'object' && !Array.isArray(input) ? input : {}
  return Object.fromEntries(
    Object.entries(source)
      .map(([rawScope, rawSetting]) => {
        const target = resolveAppSkinTargetForScope(rawScope)
        if (!target) return null
        const setting = normalizeAppSkinSetting(rawSetting)
        const isDefault =
          setting.presetId === DEFAULT_APP_SKIN_PRESET_ID &&
          setting.customCssEnabled === false &&
          setting.customCss.trim() === ''
        return isDefault ? null : [target.scope, setting]
      })
      .filter(Boolean),
  )
}

export const buildAppSkinCss = (input = {}) => {
  const settings = normalizeAppSkinSettings(input)
  return Object.entries(settings)
    .map(([scope, setting]) => {
      const preset = resolveAppSkinPreset(setting.presetId)
      const chunks = []
      if (preset.css.trim()) {
        chunks.push(scopeCssToSelector(preset.css, `[data-app="${scope}"]`))
      }
      if (setting.customCssEnabled && setting.customCss.trim()) {
        chunks.push(scopeCssToSelector(setting.customCss, `[data-app="${scope}"]`))
      }
      return chunks.filter(Boolean).join('\n\n')
    })
    .filter(Boolean)
    .join('\n\n')
}
