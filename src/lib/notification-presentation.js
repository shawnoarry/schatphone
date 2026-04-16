import { resolveAppIconMeta, resolveNotificationModuleAppId } from './app-icon-presentation'

const normalizeLocaleBucket = (locale = '') => {
  const normalized = typeof locale === 'string' ? locale.trim().toLowerCase() : ''
  if (normalized.startsWith('zh')) return 'zh'
  if (normalized.startsWith('ko')) return 'ko'
  return 'en'
}

const MODULE_COPY = {
  chat: {
    zh: '聊天',
    en: 'Chat',
    ko: '채팅',
  },
  map: {
    zh: '地图',
    en: 'Map',
    ko: '지도',
  },
  gallery: {
    zh: '相册',
    en: 'Photos',
    ko: '사진',
  },
  shopping: {
    zh: '购物',
    en: 'Shop',
    ko: '쇼핑',
  },
  forum: {
    zh: '论坛',
    en: 'Forum',
    ko: '포럼',
  },
  system: {
    zh: '系统',
    en: 'System',
    ko: '시스템',
  },
  appName: {
    zh: 'SchatPhone',
    en: 'SchatPhone',
    ko: 'SchatPhone',
  },
  minimalBody: {
    zh: '你有一条新的提醒',
    en: 'You have a new reminder.',
    ko: '새로운 알림이 도착했어요.',
  },
  standardBodies: {
    chat: {
      zh: '你收到一条新的聊天消息',
      en: 'You received a new chat message.',
      ko: '새로운 채팅 메시지를 받았어요.',
    },
    map: {
      zh: '你有一条新的行程提醒',
      en: 'You have a new trip reminder.',
      ko: '새로운 이동 알림이 있어요.',
    },
    gallery: {
      zh: '你有一条新的相册提醒',
      en: 'You have a new gallery reminder.',
      ko: '새로운 사진 관련 알림이 있어요.',
    },
    shopping: {
      zh: '你有一条新的购物提醒',
      en: 'You have a new shopping reminder.',
      ko: '새로운 쇼핑 알림이 있어요.',
    },
    forum: {
      zh: '你有一条新的互动提醒',
      en: 'You have a new interaction reminder.',
      ko: '새로운 상호작용 알림이 있어요.',
    },
    system: {
      zh: '你有一条新的系统提醒',
      en: 'You have a new system reminder.',
      ko: '새로운 시스템 알림이 있어요.',
    },
  },
}

const readLocalizedCopy = (copyMap, locale = 'en-US') => {
  const bucket = normalizeLocaleBucket(locale)
  if (!copyMap || typeof copyMap !== 'object') return ''
  return copyMap[bucket] || copyMap.en || ''
}

const detectModuleKey = (note) => {
  const source =
    typeof note?.source === 'string' && note.source.trim() ? note.source.trim().toLowerCase() : ''
  const route =
    typeof note?.route === 'string' && note.route.trim() ? note.route.trim().toLowerCase() : ''

  if (source.startsWith('chat_') || route.startsWith('/chat')) return 'chat'
  if (source.startsWith('map_') || route.startsWith('/map')) return 'map'
  if (source.startsWith('gallery_') || route.startsWith('/gallery')) return 'gallery'
  if (source.startsWith('shopping_') || route.startsWith('/shopping')) return 'shopping'
  if (source.startsWith('forum_') || route.startsWith('/forum')) return 'forum'
  return 'system'
}

const readPreviewText = (note) => {
  const candidates = [note?.pushBody, note?.pushContent, note?.content, note?.title]
  for (const value of candidates) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim()
    }
  }
  return ''
}

export const resolveNotificationModuleMeta = (note, locale = 'en-US', appIconOverrides = {}) => {
  const key = detectModuleKey(note)
  const appId = resolveNotificationModuleAppId(key)
  const appMeta = appId ? resolveAppIconMeta(appId, appIconOverrides, locale) : null
  const fallbackToneClass =
    key === 'shopping'
      ? 'accent-warm'
      : key === 'forum'
        ? 'accent-default'
        : key === 'map'
          ? 'accent-cool'
          : key === 'gallery'
            ? 'accent-light'
            : key === 'system'
              ? 'accent-dark'
              : 'accent-default'

  return {
    key,
    appId,
    label: readLocalizedCopy(MODULE_COPY[key] || MODULE_COPY.system, locale),
    icon:
      appMeta?.icon ||
      (typeof note?.icon === 'string' && note.icon.trim() ? note.icon.trim() : 'fas fa-bell'),
    toneClass: appMeta?.toneClass || fallbackToneClass,
  }
}

export const buildExternalPushFallback = (
  note,
  locale = 'en-US',
  options = {},
) => {
  const displayMode =
    typeof options?.displayMode === 'string' && options.displayMode.trim()
      ? options.displayMode.trim()
      : 'minimal'
  const moduleMeta = resolveNotificationModuleMeta(note, locale, options?.appIconOverrides || {})
  const appName = readLocalizedCopy(MODULE_COPY.appName, locale)
  const standardBodyMap =
    MODULE_COPY.standardBodies[moduleMeta.key] || MODULE_COPY.standardBodies.system
  const previewText = readPreviewText(note)

  const body =
    displayMode === 'preview' && previewText
      ? previewText
      : displayMode === 'standard'
        ? readLocalizedCopy(standardBodyMap, locale)
        : readLocalizedCopy(MODULE_COPY.minimalBody, locale)

  return {
    title: appName,
    body,
  }
}
