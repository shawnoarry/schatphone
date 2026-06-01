import { normalizeScopeToken } from './app-shell-scope'
import { scopeCssToSelector } from './appearance-scoped-css'

const MAX_APP_SKIN_CSS_LENGTH = 50_000
const DEFAULT_APP_SKIN_PRESET_ID = 'default'

export const APP_SKIN_PRESETS = Object.freeze([
  {
    id: DEFAULT_APP_SKIN_PRESET_ID,
    labelZh: '默认',
    labelEn: 'Default',
    descriptionZh: '跟随当前全局主题。',
    descriptionEn: 'Follow the current global theme.',
    css: '',
  },
  {
    id: 'market_fresh',
    labelZh: '清新店铺',
    labelEn: 'Market fresh',
    descriptionZh: '更明亮的卡片、柔和的绿色强调，适合外卖和生活类 app。',
    descriptionEn: 'Brighter cards with a soft green accent for food and lifestyle apps.',
    css: ':scope { --system-accent: #0f9f6e; --system-accent-soft: rgba(15, 159, 110, 0.15); --system-panel-bg: rgba(255, 255, 255, 0.9); }',
  },
  {
    id: 'catalog_clean',
    labelZh: '清爽目录',
    labelEn: 'Catalog clean',
    descriptionZh: '减少装饰感，让列表和商品信息更容易扫读。',
    descriptionEn: 'Quieter surfaces for scanning lists and product details.',
    css: ':scope { --system-accent: #2563eb; --system-panel-bg: rgba(248, 250, 252, 0.92); --system-card-border: rgba(37, 99, 235, 0.18); }',
  },
  {
    id: 'night_service',
    labelZh: '夜间服务',
    labelEn: 'Night service',
    descriptionZh: '偏深色的沉浸界面，适合地图、夜间订单或工具类 app。',
    descriptionEn: 'A darker immersive surface for maps, evening orders, or utilities.',
    css: ':scope { --system-page-bg: #0f172a; --system-panel-bg: rgba(15, 23, 42, 0.86); --system-text: #f8fafc; --system-text-muted: rgba(226, 232, 240, 0.72); --system-accent: #38bdf8; --system-accent-soft: rgba(56, 189, 248, 0.16); }',
  },
])

export const APP_SKIN_TARGETS = Object.freeze([
  { appId: 'app_store', scope: 'app_store', labelZh: '应用商城', labelEn: 'App Store' },
  { appId: 'app_contacts', scope: 'contacts', labelZh: '联系人', labelEn: 'Contacts' },
  { appId: 'app_gallery', scope: 'gallery', labelZh: '相册', labelEn: 'Photos' },
  { appId: 'app_map', scope: 'map', labelZh: '地图', labelEn: 'Map' },
  { appId: 'app_calendar', scope: 'calendar', labelZh: '日历', labelEn: 'Calendar' },
  { appId: 'app_shopping', scope: 'shopping', labelZh: '购物', labelEn: 'Shopping' },
  { appId: 'app_food_delivery', scope: 'food_delivery', labelZh: '外卖', labelEn: 'Food Delivery' },
  { appId: 'app_themes', scope: 'appearance', labelZh: '外观', labelEn: 'Appearance' },
])

const PRESET_IDS = new Set(APP_SKIN_PRESETS.map((preset) => preset.id))
const TARGETS_BY_APP_ID = new Map(APP_SKIN_TARGETS.map((target) => [target.appId, target]))
const TARGETS_BY_SCOPE = new Map(APP_SKIN_TARGETS.map((target) => [target.scope, target]))

const normalizeCssText = (value = '') =>
  typeof value === 'string' ? value.slice(0, MAX_APP_SKIN_CSS_LENGTH) : ''

const normalizeEnabled = (value) => (typeof value === 'boolean' ? value : false)

export const resolveAppSkinTargetForAppId = (appId = '') => {
  const normalizedId = typeof appId === 'string' ? appId.trim() : ''
  return TARGETS_BY_APP_ID.get(normalizedId) || null
}

export const resolveAppSkinTargetForScope = (scope = '') => {
  const normalizedScope = normalizeScopeToken(scope, '')
  return TARGETS_BY_SCOPE.get(normalizedScope) || null
}

export const resolveAppSkinPreset = (presetId = '') => {
  const normalizedId = typeof presetId === 'string' ? presetId.trim() : ''
  return APP_SKIN_PRESETS.find((preset) => preset.id === normalizedId) || APP_SKIN_PRESETS[0]
}

export const normalizeAppSkin = (input = {}) => {
  const source = input && typeof input === 'object' && !Array.isArray(input) ? input : {}
  const presetId =
    typeof source.presetId === 'string' && PRESET_IDS.has(source.presetId)
      ? source.presetId
      : DEFAULT_APP_SKIN_PRESET_ID
  return {
    presetId,
    customCssEnabled: normalizeEnabled(source.customCssEnabled),
    customCss: normalizeCssText(source.customCss),
  }
}

export const normalizeAppSkinSettings = (input = {}) => {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return {}
  return Object.fromEntries(
    Object.entries(input)
      .map(([rawScope, rawSkin]) => {
        const target = resolveAppSkinTargetForScope(rawScope)
        if (!target) return null
        const skin = normalizeAppSkin(rawSkin)
        const isDefault =
          skin.presetId === DEFAULT_APP_SKIN_PRESET_ID &&
          skin.customCssEnabled === false &&
          skin.customCss.trim() === ''
        return isDefault ? null : [target.scope, skin]
      })
      .filter(Boolean),
  )
}

export const buildAppSkinCss = (appSkins = {}) => {
  const normalized = normalizeAppSkinSettings(appSkins)
  return Object.entries(normalized)
    .map(([scope, skin]) => {
      const preset = resolveAppSkinPreset(skin.presetId)
      const customCss = skin.customCssEnabled ? skin.customCss : ''
      const css = [preset.css, customCss]
        .filter((chunk) => chunk && chunk.trim())
        .join('\n\n')
      return css ? scopeCssToSelector(css, `[data-app="${scope}"]`) : ''
    })
    .filter(Boolean)
    .join('\n\n')
}
