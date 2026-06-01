const normalizeText = (value, fallback = '', max = 120) => {
  if (typeof value !== 'string') return fallback
  const normalized = value.trim().replace(/\s+/g, ' ')
  if (!normalized) return fallback
  return normalized.slice(0, max)
}

const ENTRY_ICON_SOURCE_TYPES = new Set(['preset', 'gallery'])
const ENTRY_OVERRIDE_ID_PATTERN = /^(shop_app|world_app)_[a-z0-9_-]{1,180}$/i
const ENTRY_TAG_LIMIT = 6
const ENTRY_TAG_TEXT_LIMIT = 24

export const SHOP_ENTRY_TEMPLATE_OPTIONS = Object.freeze([
  {
    id: 'standard',
    labelZh: '标准店铺',
    labelEn: 'Standard shop',
    descZh: '默认外卖店铺页。',
    descEn: 'Default Food Delivery shop page.',
  },
  {
    id: 'dark_tray_menu',
    labelZh: '深色托盘菜单',
    labelEn: 'Dark tray menu',
    descZh: '适合夜间餐厅、酒馆、深色质感小店。',
    descEn: 'For night restaurants, bistros, and dark premium shops.',
  },
  {
    id: 'cafe_counter',
    labelZh: '咖啡柜台',
    labelEn: 'Cafe counter',
    descZh: '适合咖啡、面包、轻食类店铺。',
    descEn: 'For cafes, bakeries, and light meals.',
  },
  {
    id: 'dessert_window',
    labelZh: '甜品橱窗',
    labelEn: 'Dessert window',
    descZh: '适合甜品、冰品、下午茶类店铺。',
    descEn: 'For desserts, ice cream, and afternoon tea.',
  },
  {
    id: 'convenience_shelf',
    labelZh: '便利货架',
    labelEn: 'Convenience shelf',
    descZh: '适合便利店、杂货、生鲜快送。',
    descEn: 'For convenience stores, groceries, and fresh delivery.',
  },
  {
    id: 'street_food_stall',
    labelZh: '街边摊位',
    labelEn: 'Street food stall',
    descZh: '适合小吃摊、夜市、路边快餐。',
    descEn: 'For snacks, night markets, and street food.',
  },
])

const SHOP_ENTRY_TEMPLATE_SET = new Set(SHOP_ENTRY_TEMPLATE_OPTIONS.map((option) => option.id))

export const APP_ENTRY_TYPE = Object.freeze({
  APP: 'app',
  WORLD: 'world',
  SHOP: 'shop',
  SYSTEM: 'system',
})

export const normalizeAppDisplayName = (value) => normalizeText(value, '', 40)

export const normalizeEntryShortDescription = (value) => normalizeText(value, '', 110)

export const normalizeEntryTags = (value) => {
  const source = Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? value.split(/[,，\n]/)
      : []
  const seen = new Set()
  return source.reduce((acc, item) => {
    const tag = normalizeText(item, '', ENTRY_TAG_TEXT_LIMIT)
    const key = tag.toLowerCase()
    if (!tag || seen.has(key) || acc.length >= ENTRY_TAG_LIMIT) return acc
    seen.add(key)
    acc.push(tag)
    return acc
  }, [])
}

export const normalizeShopEntryTemplateId = (value) => {
  const normalized = normalizeText(value, 'standard', 40)
  return SHOP_ENTRY_TEMPLATE_SET.has(normalized) ? normalized : 'standard'
}

export const resolveShopEntryTemplateOption = (value) => {
  const templateId = normalizeShopEntryTemplateId(value)
  return SHOP_ENTRY_TEMPLATE_OPTIONS.find((option) => option.id === templateId) || SHOP_ENTRY_TEMPLATE_OPTIONS[0]
}

export const normalizeEntryOverrideId = (value) => {
  const normalized = normalizeText(value, '', 220)
  return ENTRY_OVERRIDE_ID_PATTERN.test(normalized) ? normalized : ''
}

export const normalizeEntryPresentationOverride = (value = {}, fallback = {}) => {
  if (!value || typeof value !== 'object') return null
  const sourceType = ENTRY_ICON_SOURCE_TYPES.has(normalizeText(value.sourceType, '', 20))
    ? normalizeText(value.sourceType, 'preset', 20)
    : 'preset'
  const galleryAssetId = normalizeText(value.galleryAssetId || value.imageGalleryAssetId, '', 140)
  const displayName = normalizeAppDisplayName(value.displayName)
  const icon = normalizeText(value.icon, '', 80)
  const accent = normalizeText(value.accent, '', 30)
  const shortDescription = normalizeEntryShortDescription(value.shortDescription || value.description)
  const tags = normalizeEntryTags(value.tags)
  const hasTemplateId = Object.prototype.hasOwnProperty.call(value, 'templateId')
  const templateId = hasTemplateId ? normalizeShopEntryTemplateId(value.templateId) : ''

  if (sourceType === 'gallery' && galleryAssetId) {
    return {
      sourceType: 'gallery',
      displayName,
      icon: icon || fallback.icon || 'fas fa-store',
      accent: accent || fallback.accent || 'warm',
      galleryAssetId,
      shortDescription,
      tags,
      templateId,
      hasTemplateOverride: hasTemplateId,
    }
  }

  if (!displayName && !icon && !accent && !shortDescription && tags.length === 0 && !templateId) {
    return null
  }

  return {
    sourceType: 'preset',
    displayName,
    icon: icon || fallback.icon || 'fas fa-store',
    accent: accent || fallback.accent || 'warm',
    galleryAssetId: '',
    shortDescription,
    tags,
    templateId,
    hasTemplateOverride: hasTemplateId,
  }
}

export const normalizeEntryPresentationOverrides = (input = {}) => {
  if (!input || typeof input !== 'object') return {}
  return Object.entries(input).reduce((acc, [rawId, rawOverride]) => {
    const id = normalizeEntryOverrideId(rawId)
    if (!id) return acc
    const normalized = normalizeEntryPresentationOverride(rawOverride)
    if (normalized) acc[id] = normalized
    return acc
  }, {})
}

export const resolveEntryPresentationMeta = (entry = {}, overrides = {}) => {
  const normalizedOverrides = normalizeEntryPresentationOverrides(overrides)
  const override = normalizedOverrides[normalizeEntryOverrideId(entry.id)] || null
  const fallback = {
    sourceType: 'preset',
    displayName: '',
    icon: entry.icon || 'fas fa-store',
    accent: entry.accent || 'warm',
    galleryAssetId: '',
    hasImageIcon: false,
    hasOverride: false,
    toneClass: entry.toneClass || `accent-${entry.accent || 'warm'}`,
    shortDescription: '',
    tags: [],
    templateId: '',
    hasTemplateOverride: false,
  }
  if (!override) return fallback
  return {
    ...fallback,
    ...override,
    tags: [...(override.tags || [])],
    hasOverride: true,
    hasImageIcon: override.sourceType === 'gallery' && Boolean(override.galleryAssetId),
    toneClass: `accent-${override.accent || fallback.accent}`,
  }
}

export const resolveAppEntryType = (entry = {}) => {
  if (entry.entryType) return normalizeText(entry.entryType, APP_ENTRY_TYPE.APP, 30)
  if (entry.worldAppEntry || entry.entryKind === 'world_app') return APP_ENTRY_TYPE.WORLD
  if (entry.shopAppEntry || entry.entryKind === 'shop_app') return APP_ENTRY_TYPE.SHOP
  if (entry.protectedHomeEntry || entry.categoryEn === 'System') return APP_ENTRY_TYPE.SYSTEM
  return APP_ENTRY_TYPE.APP
}

export const resolveAppEntryTypeCopy = (entryType, t = (zh, en) => en || zh) => {
  if (entryType === APP_ENTRY_TYPE.WORLD) {
    return {
      label: t('世界入口', 'World'),
      title: t('世界入口', 'World entry'),
      description: t(
        '由世界设定包生成，打开时进入现有 App 并带入世界上下文。',
        'Generated by a World Pack. Opens an existing app with world context.',
      ),
    }
  }
  if (entryType === APP_ENTRY_TYPE.SHOP) {
    return {
      label: t('店铺', 'Shops'),
      title: t('店铺入口', 'Shop entry'),
      description: t(
        '看起来像一个店铺小 App，但餐厅、菜单、购物车和订单仍由外卖管理。',
        'Looks like a shop mini-app, while restaurants, menus, cart, and orders stay in Food Delivery.',
      ),
    }
  }
  if (entryType === APP_ENTRY_TYPE.SYSTEM) {
    return {
      label: t('系统', 'System'),
      title: t('系统入口', 'System entry'),
      description: t(
        '系统能力或受保护入口，可调整展示但不能改变核心职责。',
        'Protected or system-owned entry. Presentation can change, core ownership cannot.',
      ),
    }
  }
  return {
    label: t('Apps', 'Apps'),
    title: t('独立 App', 'Independent app'),
    description: t(
      '真实功能 App。显示名、图标和皮肤可以美化，但后台身份和路由不变。',
      'A real function app. Display name, icon, and skin can change, but backend identity and route stay stable.',
    ),
  }
}

export const resolveAppEntryBoundaryCopy = (entry = {}, t = (zh, en) => en || zh) => {
  const entryType = resolveAppEntryType(entry)
  if (entryType === APP_ENTRY_TYPE.WORLD) {
    return t(
      '应用商城负责这个入口的展示、放置和打开；世界书负责设定包启用、审核和来源；目标 App 负责真实业务数据。',
      'App Store owns display, placement, and launch. WorldBook owns activation, review, and sources. The target app owns real business data.',
    )
  }
  if (entryType === APP_ENTRY_TYPE.SHOP) {
    return t(
      '应用商城负责店铺入口的显示与放置；外卖负责餐厅、菜单、购物车、订单、配送、钱包和服务号通知。',
      'App Store owns shop-entry display and placement. Food Delivery owns restaurants, menus, cart, orders, delivery, Wallet handoffs, and service notifications.',
    )
  }
  if (entryType === APP_ENTRY_TYPE.SYSTEM) {
    return t(
      '这是系统入口。应用商城可以展示它，但不能把它变成普通可删除业务 App。',
      'This is a system entry. App Store can present it, but cannot turn it into an ordinary removable business app.',
    )
  }
  return t(
    '应用商城负责用户看到的入口身份、主屏放置和外观；真实功能仍由该 App 自己负责。',
    'App Store owns visible entry identity, Home placement, and appearance. The app itself owns real functionality.',
  )
}

export const resolveDisplayName = (baseLabel, iconMeta = {}) =>
  normalizeAppDisplayName(iconMeta.displayName) || baseLabel
