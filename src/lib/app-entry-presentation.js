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

export const SHOP_ENTRY_BINDING_TARGET = Object.freeze({
  FOOD_DELIVERY: 'food_delivery',
  SHOPPING: 'shopping',
})

export const SHOP_ENTRY_BINDING_TARGET_OPTIONS = Object.freeze([
  {
    id: SHOP_ENTRY_BINDING_TARGET.FOOD_DELIVERY,
    labelZh: '外卖',
    labelEn: 'Food Delivery',
    ownerZh: 'Food Delivery 拥有餐厅、菜单、外卖购物车、结账、配送订单和服务号通知。',
    ownerEn:
      'Food Delivery owns restaurants, menus, food cart, checkout, delivery orders, and service notifications.',
  },
  {
    id: SHOP_ENTRY_BINDING_TARGET.SHOPPING,
    labelZh: '购物',
    labelEn: 'Shopping',
    ownerZh: 'Shopping 拥有商品、购物车、结账、购物订单、物流线索和服务号通知。',
    ownerEn: 'Shopping owns products, cart, checkout, shopping orders, logistics links, and service notifications.',
  },
])

const SHOP_ENTRY_BINDING_TARGET_SET = new Set(SHOP_ENTRY_BINDING_TARGET_OPTIONS.map((option) => option.id))

export const SHOP_ENTRY_TEMPLATE_OPTIONS = Object.freeze([
  {
    id: 'standard',
    labelZh: '标准店铺',
    labelEn: 'Standard shop',
    descZh: '默认通用店铺入口。',
    descEn: 'Default generic folder mini app entry.',
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

export const normalizeShopEntryBindingTarget = (value, fallback = '') => {
  const normalized = normalizeText(value, '', 40).toLowerCase()
  if (SHOP_ENTRY_BINDING_TARGET_SET.has(normalized)) return normalized
  return SHOP_ENTRY_BINDING_TARGET_SET.has(fallback) ? fallback : ''
}

export const resolveShopEntryBindingTargetOption = (value) => {
  const target = normalizeShopEntryBindingTarget(value, SHOP_ENTRY_BINDING_TARGET.FOOD_DELIVERY)
  return (
    SHOP_ENTRY_BINDING_TARGET_OPTIONS.find((option) => option.id === target) ||
    SHOP_ENTRY_BINDING_TARGET_OPTIONS[0]
  )
}

export const normalizeEntryOverrideId = (value) => {
  const normalized = normalizeText(value, '', 220)
  return ENTRY_OVERRIDE_ID_PATTERN.test(normalized) ? normalized : ''
}

const inferShopEntryBindingTargetFromId = (entryId = '') => {
  const normalizedId = normalizeEntryOverrideId(entryId)
  if (normalizedId.startsWith('shop_app_shopping_')) return SHOP_ENTRY_BINDING_TARGET.SHOPPING
  if (normalizedId.startsWith('shop_app_')) return SHOP_ENTRY_BINDING_TARGET.FOOD_DELIVERY
  return ''
}

export const normalizeEntryPresentationOverride = (value = {}, fallback = {}, options = {}) => {
  if (!value || typeof value !== 'object') return null
  const allowBindingTarget = options.allowBindingTarget === true
  const bindingTargetFallback = allowBindingTarget
    ? normalizeShopEntryBindingTarget(options.bindingTargetFallback, '')
    : ''
  const hasBindingTarget = Object.prototype.hasOwnProperty.call(value, 'bindingTarget')
  const bindingTarget = allowBindingTarget
    ? normalizeShopEntryBindingTarget(value.bindingTarget, bindingTargetFallback)
    : ''
  const bindingTargetPatch = allowBindingTarget
    ? {
        bindingTarget,
        hasBindingTargetOverride: hasBindingTarget && Boolean(bindingTarget),
      }
    : {}
  const sourceType = ENTRY_ICON_SOURCE_TYPES.has(normalizeText(value.sourceType, '', 20))
    ? normalizeText(value.sourceType, 'preset', 20)
    : 'preset'
  const galleryAssetId = normalizeText(value.galleryAssetId || value.imageGalleryAssetId, '', 140)
  const coverGalleryAssetId = normalizeText(
    value.coverGalleryAssetId || value.coverAssetId || value.coverImageGalleryAssetId,
    '',
    140,
  )
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
      coverGalleryAssetId,
      shortDescription,
      tags,
      templateId,
      hasTemplateOverride: hasTemplateId,
      ...bindingTargetPatch,
    }
  }

  if (
    !displayName &&
    !icon &&
    !accent &&
    !coverGalleryAssetId &&
    !shortDescription &&
    tags.length === 0 &&
    !templateId &&
    !bindingTarget
  ) {
    return null
  }

  return {
    sourceType: 'preset',
    displayName,
    icon: icon || fallback.icon || 'fas fa-store',
    accent: accent || fallback.accent || 'warm',
    galleryAssetId: '',
    coverGalleryAssetId,
    shortDescription,
    tags,
    templateId,
    hasTemplateOverride: hasTemplateId,
    ...bindingTargetPatch,
  }
}

export const normalizeEntryPresentationOverrides = (input = {}) => {
  if (!input || typeof input !== 'object') return {}
  return Object.entries(input).reduce((acc, [rawId, rawOverride]) => {
    const id = normalizeEntryOverrideId(rawId)
    if (!id) return acc
    const normalized = normalizeEntryPresentationOverride(rawOverride, {}, {
      allowBindingTarget: id.startsWith('shop_app_'),
      bindingTargetFallback: inferShopEntryBindingTargetFromId(id),
    })
    if (normalized) acc[id] = normalized
    return acc
  }, {})
}

export const resolveEntryPresentationMeta = (entry = {}, overrides = {}) => {
  const normalizedOverrides = normalizeEntryPresentationOverrides(overrides)
  const normalizedEntryId = normalizeEntryOverrideId(entry.id)
  const override = normalizedOverrides[normalizedEntryId] || null
  const isShopEntry = entry.shopAppEntry || entry.entryKind === 'shop_app' || normalizedEntryId.startsWith('shop_app_')
  const fallbackBindingTarget = isShopEntry
    ? normalizeShopEntryBindingTarget(
        entry.bindingTarget || entry.sourceModule || inferShopEntryBindingTargetFromId(normalizedEntryId),
        SHOP_ENTRY_BINDING_TARGET.FOOD_DELIVERY,
      )
    : ''
  const fallback = {
    sourceType: 'preset',
    displayName: '',
    icon: entry.icon || 'fas fa-store',
    accent: entry.accent || 'warm',
    galleryAssetId: '',
    hasImageIcon: false,
    coverGalleryAssetId: '',
    hasCoverImage: false,
    hasOverride: false,
    toneClass: entry.toneClass || `accent-${entry.accent || 'warm'}`,
    shortDescription: '',
    tags: [],
    templateId: '',
    hasTemplateOverride: false,
    bindingTarget: fallbackBindingTarget,
    hasBindingTargetOverride: false,
  }
  if (!override) return fallback
  const bindingTarget = isShopEntry
    ? normalizeShopEntryBindingTarget(override.bindingTarget, fallbackBindingTarget)
    : ''
  return {
    ...fallback,
    ...override,
    tags: [...(override.tags || [])],
    bindingTarget,
    hasOverride: true,
    hasImageIcon: override.sourceType === 'gallery' && Boolean(override.galleryAssetId),
    hasCoverImage: Boolean(override.coverGalleryAssetId),
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
      label: t('小应用', 'Mini apps'),
      title: t('文件夹小应用', 'Folder mini app'),
      description: t(
        '安装在 Shopping、Food Delivery 等主屏文件夹里的下一层入口；菜单或商品、购物车、订单和服务通知仍由目标文件夹 App 持有。',
        'A next-layer entry installed inside Home folders like Shopping or Food Delivery. Menus or products, cart, orders, and service notifications stay with the target folder app.',
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
    const target = normalizeShopEntryBindingTarget(
      entry.bindingTarget || entry.sourceModule || inferShopEntryBindingTargetFromId(entry.id),
      SHOP_ENTRY_BINDING_TARGET.FOOD_DELIVERY,
    )
    if (target === SHOP_ENTRY_BINDING_TARGET.SHOPPING) {
      return t(
        '应用商城负责把这个小应用入口安装到 Shopping 文件夹，并管理显示门面与打开上下文；Shopping 负责商品、购物车、结账、订单、物流线索、钱包/资产交接和服务号通知。',
        'App Store installs this mini app entry inside the Shopping folder and manages facade plus launch context. Shopping owns products, cart, checkout, orders, logistics links, Wallet/Assets handoffs, and service notifications.',
      )
    }
    return t(
      '应用商城负责把这个小应用入口安装到 Food Delivery 文件夹，并管理显示门面与打开上下文；外卖负责餐厅、菜单、购物车、订单、配送、钱包和服务号通知。',
      'App Store installs this mini app entry inside the Food Delivery folder and manages facade plus launch context. Food Delivery owns restaurants, menus, cart, orders, delivery, Wallet handoffs, and service notifications.',
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
