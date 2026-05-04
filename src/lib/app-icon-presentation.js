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
  app_themes: { zh: '外观', en: 'Themes', ko: '테마' },
  app_phone: { zh: '电话', en: 'Phone', ko: '전화' },
  app_map: { zh: '地图', en: 'Map', ko: '지도' },
  app_calendar: { zh: '日历', en: 'Calendar', ko: '캘린더' },
  app_stock: { zh: '股市', en: 'Stock', ko: '주식' },
  app_chat: { zh: '聊天', en: 'Chat', ko: '채팅' },
  app_contacts: { zh: '通讯录', en: 'Contacts', ko: '연락처' },
  app_settings: { zh: '设置', en: 'Settings', ko: '설정' },
  app_files: { zh: '文件', en: 'Files', ko: '파일' },
  app_more: { zh: '更多', en: 'More', ko: '더보기' },
}

const BUILT_IN_APP_ICON_META = {
  app_network: { icon: 'fas fa-network-wired', accent: 'cool' },
  app_wallet: { icon: 'fas fa-wallet', accent: 'warm' },
  app_gallery: { icon: 'fas fa-images', accent: 'light' },
  app_themes: { icon: 'fas fa-palette', accent: 'default' },
  app_phone: { icon: 'fas fa-phone', accent: 'default' },
  app_map: { icon: 'fas fa-map-location-dot', accent: 'cool' },
  app_calendar: { icon: 'fas fa-calendar-days', accent: 'light' },
  app_stock: { icon: 'fas fa-chart-line', accent: 'cool' },
  app_chat: { icon: 'fas fa-comment', accent: 'default' },
  app_contacts: { icon: 'fas fa-address-book', accent: 'light' },
  app_settings: { icon: 'fas fa-cog', accent: 'dark' },
  app_files: { icon: 'fas fa-folder', accent: 'cool' },
  app_more: { icon: 'fas fa-ellipsis-h', accent: 'default' },
}

export const APP_ICON_CUSTOMIZATION_TARGET_IDS = [
  'app_network',
  'app_wallet',
  'app_gallery',
  'app_themes',
  'app_phone',
  'app_chat',
  'app_map',
  'app_calendar',
  'app_stock',
  'app_settings',
  'app_contacts',
  'app_more',
]

export const APP_ICON_PRESET_OPTIONS = [
  { value: 'fas fa-comment', zh: '对话气泡', en: 'Chat Bubble', ko: '대화 말풍선' },
  { value: 'fas fa-comment-dots', zh: '消息气泡', en: 'Message Bubble', ko: '메시지 말풍선' },
  { value: 'fas fa-paper-plane', zh: '纸飞机', en: 'Paper Plane', ko: '종이비행기' },
  { value: 'fas fa-map-location-dot', zh: '地图定位', en: 'Map Pin', ko: '지도 핀' },
  { value: 'fas fa-route', zh: '路线', en: 'Route', ko: '경로' },
  { value: 'fas fa-images', zh: '相册', en: 'Photos', ko: '사진' },
  { value: 'fas fa-camera', zh: '相机', en: 'Camera', ko: '카메라' },
  { value: 'fas fa-address-book', zh: '地址簿', en: 'Address Book', ko: '주소록' },
  { value: 'fas fa-user-group', zh: '群组', en: 'People', ko: '사람들' },
  { value: 'fas fa-cog', zh: '齿轮', en: 'Gear', ko: '톱니바퀴' },
  { value: 'fas fa-sliders', zh: '滑杆', en: 'Sliders', ko: '슬라이더' },
  { value: 'fas fa-folder', zh: '文件夹', en: 'Folder', ko: '폴더' },
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

const readLocalizedCopy = (copyMap, locale = 'en-US', fallback = '') => {
  const bucket = normalizeLocaleBucket(locale)
  if (!copyMap || typeof copyMap !== 'object') return fallback
  return copyMap[bucket] || copyMap.en || fallback
}

const normalizeSingleOverride = (value, fallback = {}) => {
  if (!value || typeof value !== 'object') return null

  const icon =
    typeof value.icon === 'string' && APP_ICON_PRESET_SET.has(value.icon.trim())
      ? value.icon.trim()
      : ''
  const accent =
    typeof value.accent === 'string' && APP_ICON_ACCENT_SET.has(value.accent.trim())
      ? value.accent.trim()
      : ''

  if (!icon && !accent) return null

  return {
    icon: icon || fallback.icon || '',
    accent: accent || fallback.accent || 'default',
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

export const resolveAppIconMeta = (appId, overrides = {}, locale = 'en-US') => {
  const fallback = BUILT_IN_APP_ICON_META[appId] || {
    icon: 'fas fa-circle',
    accent: 'default',
  }
  const normalizedOverrides = normalizeAppIconOverrides(overrides)
  const override = normalizedOverrides[appId] || null

  return {
    appId,
    icon: override?.icon || fallback.icon,
    accent: override?.accent || fallback.accent,
    toneClass: `accent-${override?.accent || fallback.accent}`,
    label: readLocalizedCopy(APP_ICON_LABELS[appId], locale, appId),
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
  if (moduleKey === 'gallery') return 'app_gallery'
  if (moduleKey === 'system') return 'app_settings'
  return ''
}
