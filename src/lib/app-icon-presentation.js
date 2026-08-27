import {
  DEFAULT_SYSTEM_APP_ICON_THEME_ID,
  isSystemAppIconThemeTarget,
  resolveSystemAppIconThemeOverride,
} from './system-app-icon-theme'
import { projectUiAssetUrl } from './project-assets'

const normalizeLocaleBucket = (locale = '') => {
  const normalized = typeof locale === 'string' ? locale.trim().toLowerCase() : ''
  if (normalized.startsWith('zh')) return 'zh'
  if (normalized.startsWith('ko')) return 'ko'
  return 'en'
}

const APP_ICON_LABELS = {
  app_network: { zh: '网络', en: 'Network', ko: '네트워크' },
  app_wallet: { zh: '钱包', en: 'Wallet', ko: '지갑' },
  app_gallery: { zh: '相册', en: 'Photos', ko: '사진' },
  app_music: { zh: '音乐', en: 'Music', ko: 'Music' },
  app_camera: { zh: '相机', en: 'Camera', ko: 'Camera' },
  app_themes: { zh: '外观', en: 'Themes', ko: '테마' },
  app_widgets: { zh: '组件', en: 'Widgets', ko: '위젯' },
  app_phone: { zh: '电话', en: 'Phone', ko: '전화' },
  app_map: { zh: '地图', en: 'Map', ko: '지도' },
  app_weather: { zh: '天气', en: 'Weather', ko: '날씨' },
  app_calendar: { zh: '日历', en: 'Calendar', ko: '캘린더' },
  app_reminders: { zh: '提醒事项', en: 'Reminders', ko: 'Reminders' },
  app_stock: { zh: '股市', en: 'Stock', ko: '주식' },
  app_chat: { zh: '聊天', en: 'Chat', ko: '채팅' },
  app_contacts: { zh: '通讯录', en: 'Contacts', ko: '연락처' },
  app_settings: { zh: '设置', en: 'Settings', ko: '설정' },
  app_files: { zh: '文件', en: 'Files', ko: '파일' },
  app_shopping: { zh: '购物', en: 'Shopping', ko: '쇼핑' },
  app_assets: { zh: '资产', en: 'Assets', ko: '자산' },
  app_more: { zh: '更多', en: 'More', ko: '더보기' },
  app_store: { zh: '应用商城', en: 'App Store', ko: 'App Store' },
}

const BUILT_IN_APP_ICON_META = {
  app_network: { icon: 'fas fa-network-wired', accent: 'cool' },
  app_wallet: { icon: 'fas fa-wallet', accent: 'warm' },
  app_gallery: { icon: 'fas fa-images', accent: 'light' },
  app_music: { icon: 'fas fa-music', accent: 'warm' },
  app_camera: { icon: 'fas fa-camera', accent: 'dark' },
  app_themes: { icon: 'fas fa-palette', accent: 'default' },
  app_widgets: { icon: 'fas fa-table-cells-large', accent: 'light' },
  app_phone: { icon: 'fas fa-phone', accent: 'default' },
  app_map: { icon: 'fas fa-map-location-dot', accent: 'cool' },
  app_weather: { icon: 'fas fa-cloud-sun', accent: 'cool' },
  app_calendar: { icon: 'fas fa-calendar-days', accent: 'light' },
  app_reminders: { icon: 'fas fa-list-check', accent: 'warm' },
  app_stock: { icon: 'fas fa-chart-line', accent: 'cool' },
  app_chat: { icon: 'fas fa-comment', accent: 'default' },
  app_contacts: { icon: 'fas fa-address-book', accent: 'light' },
  app_settings: { icon: 'fas fa-cog', accent: 'dark' },
  app_files: { icon: 'fas fa-folder', accent: 'cool' },
  app_shopping: { icon: 'fas fa-bag-shopping', accent: 'warm' },
  app_assets: { icon: 'fas fa-vault', accent: 'cool' },
  app_more: { icon: 'fas fa-ellipsis-h', accent: 'default' },
  app_store: { icon: 'fas fa-store', accent: 'default' },
}

APP_ICON_LABELS.app_food_delivery = { zh: '外卖', en: 'Food', ko: 'Delivery' }
BUILT_IN_APP_ICON_META.app_food_delivery = { icon: 'fas fa-bowl-food', accent: 'warm' }
APP_ICON_LABELS.app_control_center = { zh: '世界中枢', en: 'World Hub', ko: 'World Hub' }
BUILT_IN_APP_ICON_META.app_control_center = {
  icon: 'fas fa-wand-magic-sparkles',
  accent: 'dark',
}
APP_ICON_LABELS.app_agenda_journey = { zh: '行程', en: 'Agenda Journey', ko: '일정 여정' }
BUILT_IN_APP_ICON_META.app_agenda_journey = { icon: 'fas fa-route', accent: 'cool' }
APP_ICON_LABELS.app_book = { zh: '文本库', en: 'Book', ko: 'Book' }
BUILT_IN_APP_ICON_META.app_book = { icon: 'fas fa-book-open', accent: 'cool' }
APP_ICON_LABELS.app_daon_mail = { zh: '邮件', en: 'Mail', ko: '메일' }
BUILT_IN_APP_ICON_META.app_daon_mail = { icon: 'fas fa-envelope-open-text', accent: 'cool' }
APP_ICON_LABELS.app_browser = { zh: '浏览器', en: 'Browser', ko: '브라우저' }
BUILT_IN_APP_ICON_META.app_browser = {
  icon: 'fas fa-compass',
  accent: 'cool',
  imageUrl: projectUiAssetUrl('shared/app-icons/prism-browser-app-icon-v1.png'),
}
APP_ICON_LABELS.app_community = { zh: '涟漪', en: 'Ripple', ko: '리플' }
BUILT_IN_APP_ICON_META.app_community = {
  icon: 'fas fa-wave-square',
  accent: 'warm',
  imageUrl: projectUiAssetUrl('shared/app-icons/ripple-community-app-icon-v1.png'),
}
APP_ICON_LABELS.app_healthcare = { zh: '温谈健康', en: 'Ondam Care', ko: '온담 케어' }
BUILT_IN_APP_ICON_META.app_healthcare = {
  icon: 'fas fa-heart-pulse',
  accent: 'cool',
  imageUrl: projectUiAssetUrl('shared/app-icons/ondam-care-app-icon-v2.png'),
}
APP_ICON_LABELS.app_jari_housing = { zh: '住处', en: 'Jari', ko: '자리' }
BUILT_IN_APP_ICON_META.app_jari_housing = {
  icon: 'fas fa-house-chimney-window',
  accent: 'warm',
  imageUrl: projectUiAssetUrl('shared/app-icons/jari-housing-app-icon-v1.png'),
}
APP_ICON_LABELS.app_workplace = { zh: '工作台', en: 'Work Hub', ko: '워크허브' }
BUILT_IN_APP_ICON_META.app_workplace = { icon: 'fas fa-id-badge', accent: 'dark' }
APP_ICON_LABELS.app_fandom = { zh: '星集', en: 'Aster', ko: '아스터' }
BUILT_IN_APP_ICON_META.app_fandom = { icon: 'fas fa-star', accent: 'cool' }
APP_ICON_LABELS.app_tickets = { zh: '入场', en: 'GATE', ko: '게이트' }
BUILT_IN_APP_ICON_META.app_tickets = { icon: 'fas fa-ticket', accent: 'warm' }
APP_ICON_LABELS.app_travel = { zh: '漫泊', en: 'ROAM', ko: '로우밍' }
BUILT_IN_APP_ICON_META.app_travel = { icon: 'fas fa-suitcase-rolling', accent: 'cool' }
APP_ICON_LABELS.app_intercity = { zh: '联程', en: 'VIA', ko: '비아' }
BUILT_IN_APP_ICON_META.app_intercity = { icon: 'fas fa-train', accent: 'cool' }
APP_ICON_LABELS.app_creator_rights = { zh: '谱权', en: 'CREDO', ko: '크레도' }
BUILT_IN_APP_ICON_META.app_creator_rights = { icon: 'fas fa-copyright', accent: 'dark' }
APP_ICON_LABELS.app_parcel = { zh: '递送', en: 'POSTA', ko: '포스타' }
BUILT_IN_APP_ICON_META.app_parcel = { icon: 'fas fa-box', accent: 'warm' }
APP_ICON_LABELS.app_career = { zh: '机会', en: 'NEXT', ko: '넥스트' }
BUILT_IN_APP_ICON_META.app_career = { icon: 'fas fa-briefcase', accent: 'default' }

export const APP_ICON_CUSTOMIZATION_TARGET_IDS = [
  'app_network',
  'app_wallet',
  'app_gallery',
  'app_music',
  'app_camera',
  'app_themes',
  'app_widgets',
  'app_phone',
  'app_chat',
  'app_map',
  'app_weather',
  'app_calendar',
  'app_agenda_journey',
  'app_reminders',
  'app_stock',
  'app_shopping',
  'app_food_delivery',
  'app_assets',
  'app_control_center',
  'app_book',
  'app_daon_mail',
  'app_browser',
  'app_community',
  'app_healthcare',
  'app_jari_housing',
  'app_workplace',
  'app_fandom',
  'app_tickets',
  'app_travel',
  'app_intercity',
  'app_creator_rights',
  'app_parcel',
  'app_career',
  'app_settings',
  'app_contacts',
  'app_files',
  'app_store',
]

const APP_ICON_CUSTOMIZATION_TARGET_ID_SET = new Set(APP_ICON_CUSTOMIZATION_TARGET_IDS)

export const isAppIconCustomizationTarget = (appId) =>
  APP_ICON_CUSTOMIZATION_TARGET_ID_SET.has(appId)

export const APP_ICON_PRESET_OPTIONS = [
  { value: 'fas fa-network-wired', zh: '网络节点', en: 'Network Nodes', ko: '네트워크 노드' },
  { value: 'fas fa-wallet', zh: '钱包', en: 'Wallet', ko: '지갑' },
  { value: 'fas fa-comment', zh: '对话气泡', en: 'Chat Bubble', ko: '대화 말풍선' },
  { value: 'fas fa-comment-dots', zh: '消息气泡', en: 'Message Bubble', ko: '메시지 말풍선' },
  { value: 'fas fa-paper-plane', zh: '纸飞机', en: 'Paper Plane', ko: '종이비행기' },
  { value: 'fas fa-map-location-dot', zh: '地图定位', en: 'Map Pin', ko: '지도 핀' },
  { value: 'fas fa-cloud-sun', zh: '晴间多云', en: 'Weather', ko: '날씨' },
  { value: 'fas fa-route', zh: '路线', en: 'Route', ko: '경로' },
  { value: 'fas fa-images', zh: '相册', en: 'Photos', ko: '사진' },
  { value: 'fas fa-music', zh: '音符', en: 'Music Note', ko: 'Music' },
  { value: 'fas fa-camera', zh: '相机', en: 'Camera', ko: '카메라' },
  { value: 'fas fa-palette', zh: '调色盘', en: 'Palette', ko: '팔레트' },
  { value: 'fas fa-phone', zh: '电话', en: 'Phone', ko: '전화' },
  { value: 'fas fa-calendar-days', zh: '日历', en: 'Calendar', ko: '캘린더' },
  { value: 'fas fa-address-book', zh: '地址簿', en: 'Address Book', ko: '주소록' },
  { value: 'fas fa-user-group', zh: '群组', en: 'People', ko: '사람들' },
  { value: 'fas fa-chart-line', zh: '趋势线', en: 'Trend Line', ko: '추세선' },
  { value: 'fas fa-cog', zh: '齿轮', en: 'Gear', ko: '톱니바퀴' },
  { value: 'fas fa-sliders', zh: '滑杆', en: 'Sliders', ko: '슬라이더' },
  { value: 'fas fa-folder', zh: '文件夹', en: 'Folder', ko: '폴더' },
  { value: 'fas fa-bag-shopping', zh: '购物袋', en: 'Shopping Bag', ko: '쇼핑백' },
  { value: 'fas fa-bowl-food', zh: '餐食', en: 'Food Bowl', ko: '음식 그릇' },
  { value: 'fas fa-vault', zh: '保险库', en: 'Vault', ko: '금고' },
  { value: 'fas fa-store', zh: '商店', en: 'Store', ko: '상점' },
  { value: 'fas fa-table-cells-large', zh: '组件网格', en: 'Widget Grid', ko: '위젯 그리드' },
  { value: 'fas fa-puzzle-piece', zh: '组件拼块', en: 'Widget Piece', ko: '위젯 조각' },
  { value: 'fas fa-shapes', zh: '组合图形', en: 'Shapes', ko: '도형' },
  { value: 'fas fa-list-check', zh: '待办清单', en: 'Checklist', ko: 'Checklist' },
  { value: 'fas fa-book-open', zh: '打开的书', en: 'Open Book', ko: '펼친 책' },
  { value: 'fas fa-compass', zh: '指南针', en: 'Compass', ko: '나침반' },
  { value: 'fas fa-wave-square', zh: '信息涟漪', en: 'Signal Wave', ko: '정보 파동' },
  { value: 'fas fa-heart-pulse', zh: '健康脉搏', en: 'Care Pulse', ko: '건강 맥박' },
  { value: 'fas fa-house-chimney-window', zh: '住处', en: 'Home', ko: '주거' },
  { value: 'fas fa-wand-magic-sparkles', zh: '魔法光点', en: 'Magic Wand', ko: '마법 지팡이' },
  { value: 'fas fa-ellipsis-h', zh: '更多点', en: 'More Dots', ko: '더보기 점' },
]

export const APP_ICON_ACCENT_OPTIONS = [
  { value: 'default', zh: '默认', en: 'Default', ko: '기본' },
  { value: 'cool', zh: '冷色', en: 'Cool', ko: '쿨' },
  { value: 'warm', zh: '暖色', en: 'Warm', ko: '웜' },
  { value: 'light', zh: '浅色', en: 'Light', ko: '라이트' },
  { value: 'dark', zh: '深色', en: 'Dark', ko: '다크' },
]

const APP_ICON_PRESET_SET = new Set(APP_ICON_PRESET_OPTIONS.map((item) => item.value))
const APP_ICON_ACCENT_SET = new Set(APP_ICON_ACCENT_OPTIONS.map((item) => item.value))
const APP_ICON_SOURCE_TYPES = new Set(['preset', 'gallery'])

const readLocalizedCopy = (copyMap, locale = 'en-US', fallback = '') => {
  const bucket = normalizeLocaleBucket(locale)
  if (!copyMap || typeof copyMap !== 'object') return fallback
  return copyMap[bucket] || copyMap.en || fallback
}

const normalizeIconSourceType = (value) => {
  const normalized = typeof value === 'string' ? value.trim() : ''
  return APP_ICON_SOURCE_TYPES.has(normalized) ? normalized : 'preset'
}

const normalizeGalleryAssetId = (value) => {
  if (typeof value !== 'string') return ''
  return value.trim().slice(0, 140)
}

const normalizeDisplayName = (value) => {
  if (typeof value !== 'string') return ''
  return value.trim().replace(/\s+/g, ' ').slice(0, 40)
}

const normalizeSingleOverride = (value, fallback = {}) => {
  if (!value || typeof value !== 'object') return null

  const sourceType = normalizeIconSourceType(value.sourceType || value.imageSourceType)
  const galleryAssetId = normalizeGalleryAssetId(value.galleryAssetId || value.imageGalleryAssetId)
  const displayName = normalizeDisplayName(value.displayName)
  const icon =
    typeof value.icon === 'string' && APP_ICON_PRESET_SET.has(value.icon.trim())
      ? value.icon.trim()
      : ''
  const accent =
    typeof value.accent === 'string' && APP_ICON_ACCENT_SET.has(value.accent.trim())
      ? value.accent.trim()
      : ''

  if (sourceType === 'gallery' && galleryAssetId) {
    return {
      sourceType: 'gallery',
      icon: icon || fallback.icon || 'fas fa-circle',
      accent: accent || fallback.accent || 'default',
      galleryAssetId,
      displayName,
    }
  }

  if (!icon && !accent && !displayName) return null

  return {
    sourceType: 'preset',
    icon: icon || fallback.icon || 'fas fa-circle',
    accent: accent || fallback.accent || 'default',
    galleryAssetId: '',
    displayName,
  }
}

export const normalizeAppIconOverrides = (input) => {
  if (!input || typeof input !== 'object') return {}
  const normalized = {}

  Object.entries(BUILT_IN_APP_ICON_META).forEach(([appId, fallback]) => {
    const entry = normalizeSingleOverride(input[appId], fallback)
    if (entry) {
      normalized[appId] = entry
    }
  })

  return normalized
}

export const resolveAppIconMeta = (
  appId,
  overrides = {},
  locale = 'en-US',
  systemAppIconTheme = DEFAULT_SYSTEM_APP_ICON_THEME_ID,
  options = {},
) => {
  const fallback = BUILT_IN_APP_ICON_META[appId] || {
    icon: 'fas fa-circle',
    accent: 'default',
  }
  const normalizedOverrides = normalizeAppIconOverrides(overrides)
  const override = normalizedOverrides[appId] || null
  const fallbackImageUrl = typeof fallback.imageUrl === 'string' ? fallback.imageUrl.trim() : ''
  const themeOverride = resolveSystemAppIconThemeOverride(appId, systemAppIconTheme)
  const themeImageUrl =
    typeof themeOverride?.imageUrl === 'string' ? themeOverride.imageUrl.trim() : ''
  const preferThemeIcon = options?.preferThemeIcon === true
  const useThemeVisual =
    isSystemAppIconThemeTarget(appId) && (preferThemeIcon || !override)
  const useOverrideVisual = Boolean(override) && !useThemeVisual
  const resolvedIcon = useThemeVisual
    ? themeOverride?.icon || fallback.icon
    : override?.icon || fallback.icon
  const resolvedAccent = useThemeVisual
    ? themeOverride?.accent || fallback.accent
    : override?.accent || fallback.accent
  const resolvedMaterial = useThemeVisual ? themeOverride?.material || '' : ''
  const resolvedLiquidGlyph = useThemeVisual ? themeOverride?.liquidGlyph || null : null
  return {
    appId,
    icon: resolvedIcon,
    accent: resolvedAccent,
    toneClass: `accent-${resolvedAccent}`,
    material: resolvedMaterial,
    materialClass: resolvedMaterial ? `material-${resolvedMaterial}` : '',
    liquidGlyph: resolvedLiquidGlyph,
    label: readLocalizedCopy(APP_ICON_LABELS[appId], locale, appId),
    displayName: override?.displayName || '',
    sourceType: useOverrideVisual ? override?.sourceType || 'preset' : 'preset',
    galleryAssetId:
      useOverrideVisual && override?.sourceType === 'gallery' ? override.galleryAssetId : '',
    hasImageIcon:
      useOverrideVisual && override?.sourceType === 'gallery' && Boolean(override.galleryAssetId),
    imageUrl: useThemeVisual
      ? themeImageUrl || fallbackImageUrl
      : useOverrideVisual
        ? ''
        : fallbackImageUrl,
    hasPerAppVisualOverride: Boolean(override),
    isThemeVisualPreferred: useThemeVisual && Boolean(override),
  }
}

export const resolveAppIconPresetLabel = (value, locale = 'en-US') => {
  const option = APP_ICON_PRESET_OPTIONS.find((item) => item.value === value)
  return option ? readLocalizedCopy(option, locale, value) : value
}

export const resolveAppAccentLabel = (value, locale = 'en-US') => {
  const option = APP_ICON_ACCENT_OPTIONS.find((item) => item.value === value)
  return option ? readLocalizedCopy(option, locale, value) : value
}

export const resolveAppCustomizationTargetMeta = (appId, locale = 'en-US', overrides = {}) => {
  const resolved = resolveAppIconMeta(appId, overrides, locale)
  return {
    ...resolved,
    title: readLocalizedCopy(APP_ICON_LABELS[appId], locale, appId),
  }
}

export const resolveNotificationModuleAppId = (moduleKey) => {
  if (moduleKey === 'chat') return 'app_chat'
  if (moduleKey === 'map') return 'app_map'
  if (moduleKey === 'calendar') return 'app_calendar'
  if (moduleKey === 'agenda_journey') return 'app_agenda_journey'
  if (moduleKey === 'reminders') return 'app_reminders'
  if (moduleKey === 'gallery') return 'app_gallery'
  if (moduleKey === 'music') return 'app_music'
  if (moduleKey === 'camera') return 'app_camera'
  if (moduleKey === 'phone') return 'app_phone'
  if (moduleKey === 'wallet') return 'app_wallet'
  if (moduleKey === 'mail') return 'app_daon_mail'
  if (moduleKey === 'browser') return 'app_browser'
  if (moduleKey === 'community') return 'app_community'
  if (moduleKey === 'fandom') return 'app_fandom'
  if (moduleKey === 'tickets') return 'app_tickets'
  if (moduleKey === 'travel') return 'app_travel'
  if (moduleKey === 'intercity') return 'app_intercity'
  if (moduleKey === 'creator_rights') return 'app_creator_rights'
  if (moduleKey === 'parcel') return 'app_parcel'
  if (moduleKey === 'career') return 'app_career'
  if (moduleKey === 'healthcare') return 'app_healthcare'
  if (moduleKey === 'housing') return 'app_jari_housing'
  if (moduleKey === 'shopping') return 'app_shopping'
  if (moduleKey === 'food_delivery') return 'app_food_delivery'
  if (moduleKey === 'assets') return 'app_assets'
  if (moduleKey === 'system') return 'app_settings'
  return ''
}
