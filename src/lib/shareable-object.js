export const SHAREABLE_OBJECT_TYPES = Object.freeze({
  GIFT_CARD: 'gift_card',
  VIRTUAL_GIFT: 'virtual_gift',
  PRODUCT_LINK: 'product_link',
  ORDER_SHARE: 'order_share',
  TRACKING_SHARE: 'tracking_share',
  FOOD_SHOP_LINK: 'food_shop_link',
  FOOD_ORDER_SHARE: 'food_order_share',
  LOCATION_SHARE: 'location_share',
  MUSIC_TRACK_SHARE: 'music_track_share',
  ROUTE_SHARE: 'route_share',
  CALENDAR_INVITE: 'calendar_invite',
  REMINDER_CUE_SHARE: 'reminder_cue_share',
  GALLERY_ASSET_SHARE: 'gallery_asset_share',
  ASSET_RECORD_SHARE: 'asset_record_share',
  PAYEE_ACCOUNT: 'payee_account',
  WALLET_RECEIPT_SHARE: 'wallet_receipt_share',
})

export const SHAREABLE_SOURCE_MODULES = Object.freeze({
  SHOPPING: 'shopping',
  LOGISTICS: 'logistics',
  FOOD_DELIVERY: 'food_delivery',
  MAP: 'map',
  MUSIC: 'music',
  CALENDAR: 'calendar',
  REMINDERS: 'reminders',
  GALLERY: 'gallery',
  ASSETS: 'assets',
  WALLET: 'wallet',
})

const VALID_SHARE_TYPES = new Set(Object.values(SHAREABLE_OBJECT_TYPES))
const VALID_SOURCE_MODULES = new Set(Object.values(SHAREABLE_SOURCE_MODULES))
const MAX_INTERNAL_ROUTE_LENGTH = 2048

const trimTo = (value, max = 120, fallback = '') => {
  if (typeof value !== 'string') return fallback
  const normalized = value.trim().replace(/\s+/g, ' ')
  if (!normalized) return fallback
  return normalized.slice(0, max)
}

const normalizeShareType = (value, fallback = SHAREABLE_OBJECT_TYPES.PRODUCT_LINK) => {
  const normalized = trimTo(value, 80, fallback)
  return VALID_SHARE_TYPES.has(normalized) ? normalized : fallback
}

const normalizeSourceModule = (value, fallback = SHAREABLE_SOURCE_MODULES.SHOPPING) => {
  const normalized = trimTo(value, 80, fallback)
  return VALID_SOURCE_MODULES.has(normalized) ? normalized : fallback
}

const sanitizeRoute = (value, fallback = '') => {
  const normalized = trimTo(value, MAX_INTERNAL_ROUTE_LENGTH, fallback)
  if (!normalized) return ''
  if (!normalized.startsWith('/')) return fallback
  if (normalized.startsWith('//')) return fallback
  return normalized
}

const sanitizeActions = (actions = []) => {
  if (!Array.isArray(actions)) return []
  return actions
    .map((action) => {
      if (!action || typeof action !== 'object') return null
      const key = trimTo(action.key, 80)
      const label = trimTo(action.label, 80)
      if (!key || !label) return null
      return {
        key,
        label,
        route: sanitizeRoute(action.route),
        intent: trimTo(action.intent, 80),
      }
    })
    .filter(Boolean)
    .slice(0, 4)
}

const normalizeAiContext = (aiContext = {}, fallback = {}) => {
  const sourceTruthOwner = trimTo(
    aiContext.sourceTruthOwner || fallback.sourceTruthOwner,
    80,
    'Source app',
  )
  return {
    intent: trimTo(aiContext.intent || fallback.intent, 80, 'share'),
    recipientMeaning: trimTo(aiContext.recipientMeaning || fallback.recipientMeaning, 300),
    sourceTruthOwner,
    mutationBoundary: trimTo(
      aiContext.mutationBoundary || fallback.mutationBoundary,
      300,
      `Chat displays this shared object; ${sourceTruthOwner} owns the source state.`,
    ),
  }
}

const buildRouteQuery = (entries = {}) => {
  const pairs = Object.entries(entries)
    .map(([key, value]) => [trimTo(key, 40), trimTo(String(value ?? ''), 160)])
    .filter(([key, value]) => key && value)
  if (pairs.length === 0) return ''
  return pairs
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&')
}

const appendRouteQuery = (route = '', entries = {}) => {
  const normalizedRoute = sanitizeRoute(route)
  if (!normalizedRoute) return ''
  try {
    const url = new URL(normalizedRoute, 'https://schatphone.local')
    Object.entries(entries).forEach(([key, value]) => {
      const normalizedKey = trimTo(key, 40)
      const normalizedValue = trimTo(String(value ?? ''), 160)
      if (normalizedKey && normalizedValue) url.searchParams.set(normalizedKey, normalizedValue)
    })
    return sanitizeRoute(`${url.pathname}${url.search}${url.hash}`)
  } catch {
    return normalizedRoute
  }
}

export const normalizeShareableObject = (input = {}) => {
  if (!input || typeof input !== 'object') return null
  const type = normalizeShareType(input.type)
  const sourceModule = normalizeSourceModule(input.sourceModule)
  const sourceId = trimTo(input.sourceId || input.id, 140)
  const title = trimTo(input.title || input.label, 120)
  if (!sourceId || !title) return null

  const now = Date.now()
  return {
    id: trimTo(input.id, 160, `${sourceModule}:${sourceId}:${type}`),
    type,
    sourceModule,
    sourceId,
    sourceEventId: trimTo(input.sourceEventId, 140),
    title,
    summary: trimTo(input.summary || input.desc || input.description, 300),
    statusLabel: trimTo(input.statusLabel, 80),
    amountLabel: trimTo(input.amountLabel || input.price || input.amount, 80),
    previewImageUrl: trimTo(input.previewImageUrl || input.imageUrl, 400),
    route: sanitizeRoute(input.route),
    actions: sanitizeActions(input.actions),
    aiContext: normalizeAiContext(input.aiContext),
    createdAt: Number.isFinite(Number(input.createdAt)) ? Math.floor(Number(input.createdAt)) : now,
    expiresAt: Number.isFinite(Number(input.expiresAt)) ? Math.floor(Number(input.expiresAt)) : 0,
    category: trimTo(input.category, 80),
    serviceKey: trimTo(input.serviceKey, 80),
    serviceLabel: trimTo(input.serviceLabel, 120),
  }
}

export const shareableObjectToChatBlock = (shareable = {}, options = {}) => {
  const normalized = normalizeShareableObject(shareable)
  if (!normalized) return null
  const recipientChatId = trimTo(String(options?.recipientChatId ?? ''), 40)
  const route =
    normalized.type === SHAREABLE_OBJECT_TYPES.WALLET_RECEIPT_SHARE && recipientChatId
      ? appendRouteQuery(normalized.route, {
          source: 'chat_share',
          returnChatId: recipientChatId,
        })
      : normalized.route
  return {
    type: 'share_card',
    shareType: normalized.type,
    sourceModule: normalized.sourceModule,
    sourceId: normalized.sourceId,
    sourceEventId: normalized.sourceEventId,
    title: normalized.title,
    summary: normalized.summary,
    statusLabel: normalized.statusLabel,
    amountLabel: normalized.amountLabel,
    previewImageUrl: normalized.previewImageUrl,
    route,
    actions: normalized.actions,
    aiContext: normalized.aiContext,
    category: normalized.category,
    serviceKey: normalized.serviceKey,
    serviceLabel: normalized.serviceLabel,
  }
}

export const createProductLinkShareObject = (product = {}) => {
  const productId = trimTo(product.id || product.productId, 140)
  const category = trimTo(product.category, 80)
  const query = buildRouteQuery({
    productId,
    category,
    service: product.serviceKey,
    source: 'chat',
    intent: SHAREABLE_OBJECT_TYPES.PRODUCT_LINK,
  })
  return normalizeShareableObject({
    id: `shopping-product-link:${productId}`,
    type: SHAREABLE_OBJECT_TYPES.PRODUCT_LINK,
    sourceModule: SHAREABLE_SOURCE_MODULES.SHOPPING,
    sourceId: productId,
    title: product.title,
    summary: product.desc || product.summary,
    statusLabel: 'Product link',
    amountLabel: product.price || product.amountLabel,
    route: query ? `/shopping?${query}` : '/shopping',
    category,
    serviceKey: product.serviceKey,
    serviceLabel: product.serviceLabel,
    aiContext: {
      intent: SHAREABLE_OBJECT_TYPES.PRODUCT_LINK,
      recipientMeaning:
        'The user shared a Shopping product link for browsing or recommendation. It does not mean the item was purchased or delivered.',
      sourceTruthOwner: 'Shopping',
      mutationBoundary: 'Chat replies can discuss this product link, but Shopping owns product, cart, checkout, and order state.',
    },
  })
}

export const createVirtualGiftShareObject = (product = {}) => {
  const productId = trimTo(product.id || product.productId, 140)
  const query = buildRouteQuery({
    productId,
    source: 'chat',
    intent: SHAREABLE_OBJECT_TYPES.VIRTUAL_GIFT,
  })
  return normalizeShareableObject({
    id: `shopping-virtual-gift:${productId}`,
    type: product.shareType === SHAREABLE_OBJECT_TYPES.GIFT_CARD
      ? SHAREABLE_OBJECT_TYPES.GIFT_CARD
      : SHAREABLE_OBJECT_TYPES.VIRTUAL_GIFT,
    sourceModule: SHAREABLE_SOURCE_MODULES.SHOPPING,
    sourceId: productId,
    title: product.title,
    summary: product.desc || product.summary,
    statusLabel: product.shareType === SHAREABLE_OBJECT_TYPES.GIFT_CARD ? 'Gift card' : 'Virtual gift',
    amountLabel: product.price || product.amountLabel,
    route: query ? `/shopping?${query}` : '/shopping',
    category: product.category,
    serviceKey: product.serviceKey,
    serviceLabel: product.serviceLabel,
    aiContext: {
      intent: product.shareType === SHAREABLE_OBJECT_TYPES.GIFT_CARD
        ? SHAREABLE_OBJECT_TYPES.GIFT_CARD
        : SHAREABLE_OBJECT_TYPES.VIRTUAL_GIFT,
      recipientMeaning:
        'The user sent a source-created digital gift object. The recipient may react to receiving or redeeming it.',
      sourceTruthOwner: 'Shopping',
      mutationBoundary: 'Chat displays the gift card, while Shopping owns purchase, validity, and redemption state.',
    },
  })
}

export const createTrackingShareObject = (input = {}) => {
  const sourceId = trimTo(input.sourceId || input.orderId || input.id, 140)
  const route = sanitizeRoute(input.route) ||
    `/shopping?${buildRouteQuery({ category: 'logistics', orderId: sourceId, source: 'chat', intent: 'tracking_share' })}`
  return normalizeShareableObject({
    id: `logistics-tracking:${sourceId}`,
    type: SHAREABLE_OBJECT_TYPES.TRACKING_SHARE,
    sourceModule: SHAREABLE_SOURCE_MODULES.LOGISTICS,
    sourceId,
    sourceEventId: input.sourceEventId,
    title: input.title || 'Package tracking',
    summary: input.summary || input.desc,
    statusLabel: input.statusLabel || 'Tracking',
    route,
    aiContext: {
      intent: SHAREABLE_OBJECT_TYPES.TRACKING_SHARE,
      recipientMeaning:
        'The user shared a package or delivery tracking object. The recipient may need to wait for delivery or sign after arrival.',
      sourceTruthOwner: 'Logistics',
      mutationBoundary: 'Chat replies can discuss the delivery, but Logistics or Shopping owns tracking, signature, and delivery state.',
    },
  })
}

export const createMapLocationShareObject = (input = {}) => {
  const placeId = trimTo(input.placeId || input.sourceId || input.id, 140)
  const mapPackId = trimTo(input.mapPackId, 140)
  const query = buildRouteQuery({
    placeId,
    mapPackId,
    source: 'chat',
    intent: SHAREABLE_OBJECT_TYPES.LOCATION_SHARE,
  })
  return normalizeShareableObject({
    id: `map-location:${placeId}`,
    type: SHAREABLE_OBJECT_TYPES.LOCATION_SHARE,
    sourceModule: SHAREABLE_SOURCE_MODULES.MAP,
    sourceId: placeId,
    title: input.title || input.label,
    summary: input.summary || input.detail,
    statusLabel: input.statusLabel || 'Location',
    route: query ? `/map?${query}` : '/map',
    category: input.category,
    aiContext: {
      intent: SHAREABLE_OBJECT_TYPES.LOCATION_SHARE,
      recipientMeaning:
        'The user shared a Map place for conversation, meeting context, or route planning.',
      sourceTruthOwner: 'Map',
      mutationBoundary:
        'Chat can discuss this place, but Map owns place details, visibility, position, and trip state.',
    },
  })
}

export const createMusicTrackShareObject = (input = {}) => {
  const trackRef = input.trackRef && typeof input.trackRef === 'object' ? input.trackRef : {}
  const presentation =
    input.presentation && typeof input.presentation === 'object' ? input.presentation : input
  const trackId = trimTo(trackRef.id || input.trackId || input.sourceId || input.id, 180)
  const query = buildRouteQuery({
    source: 'chat',
    track: trackId,
  })
  const artist = trimTo(presentation.artist, 120)
  const album = trimTo(presentation.album, 120)
  return normalizeShareableObject({
    id: `music-track:${trackId}`,
    type: SHAREABLE_OBJECT_TYPES.MUSIC_TRACK_SHARE,
    sourceModule: SHAREABLE_SOURCE_MODULES.MUSIC,
    sourceId: trackId,
    title: presentation.title,
    summary: [artist, album].filter(Boolean).join(' · '),
    statusLabel: input.statusLabel || 'Track',
    previewImageUrl: presentation.coverUrl,
    route: query ? `/music?${query}` : '/music',
    category: artist,
    aiContext: {
      intent: SHAREABLE_OBJECT_TYPES.MUSIC_TRACK_SHARE,
      recipientMeaning:
        'The user shared a Music track for listening context or conversation. Sharing does not start playback.',
      sourceTruthOwner: 'Music',
      mutationBoundary:
        'Chat can discuss this track, but Music owns playback, queue, library, favorites, and provider state.',
    },
  })
}

export const createPayeeAccountShareObject = (input = {}) => {
  const payeeAccountId = trimTo(input.payeeAccountId || input.id, 140)
  const ownerProfileId = trimTo(input.ownerProfileId || input.profileId, 40)
  const sourceChatId = trimTo(input.sourceChatId || input.chatId, 40)
  const sourceMessageId = trimTo(input.sourceMessageId || input.messageId, 140)
  const currency = trimTo(input.currency, 8).toUpperCase()
  const query = buildRouteQuery({
    source: 'chat',
    intent: SHAREABLE_OBJECT_TYPES.PAYEE_ACCOUNT,
    payeeAccountId,
    profileId: ownerProfileId,
    chatId: sourceChatId,
    messageId: sourceMessageId,
    amount: input.amount,
    currency,
    note: input.note,
  })
  return normalizeShareableObject({
    id: `wallet-payee-account:${payeeAccountId}`,
    type: SHAREABLE_OBJECT_TYPES.PAYEE_ACCOUNT,
    sourceModule: SHAREABLE_SOURCE_MODULES.WALLET,
    sourceId: payeeAccountId,
    sourceEventId: sourceMessageId,
    title: input.title || `${input.institutionLabel || 'Bank'} · ${currency}`,
    summary: input.summary,
    statusLabel: input.statusLabel || 'Verified account',
    amountLabel: input.amount ? `${trimTo(input.amount, 24)} ${currency}` : currency,
    route: query ? `/wallet?${query}` : '/wallet',
    category: currency,
    serviceKey: input.institutionId,
    serviceLabel: input.institutionLabel,
    aiContext: {
      intent: SHAREABLE_OBJECT_TYPES.PAYEE_ACCOUNT,
      recipientMeaning:
        'The role shared a system-verified receiving-account reference. The account fields come from the persisted role profile, not generated dialogue.',
      sourceTruthOwner: 'Wallet',
      mutationBoundary:
        'This card does not move money. The user must review and confirm the same-currency transfer in Wallet.',
    },
  })
}

export const createWalletReceiptShareObject = (input = {}) => {
  const receiptId = trimTo(input.receiptId || input.transactionId || input.id, 140)
  if (!receiptId) return null
  const receiptNumber = trimTo(input.receiptNumber, 80)
  const currency = trimTo(input.currency, 8).toUpperCase()
  const query = buildRouteQuery({
    receiptId,
    intent: SHAREABLE_OBJECT_TYPES.WALLET_RECEIPT_SHARE,
  })
  return normalizeShareableObject({
    id: `wallet-receipt:${receiptId}`,
    type: SHAREABLE_OBJECT_TYPES.WALLET_RECEIPT_SHARE,
    sourceModule: SHAREABLE_SOURCE_MODULES.WALLET,
    sourceId: receiptId,
    sourceEventId: receiptNumber,
    title: input.title || 'Transfer receipt',
    summary: input.summary,
    statusLabel: input.statusLabel || 'Completed',
    amountLabel:
      input.amountLabel ||
      (input.amount && currency ? `${trimTo(input.amount, 24)} ${currency}` : currency),
    route: query ? `/wallet?${query}` : '/wallet',
    category: currency,
    createdAt: input.createdAt,
    aiContext: {
      intent: SHAREABLE_OBJECT_TYPES.WALLET_RECEIPT_SHARE,
      recipientMeaning:
        'The user shared a completed Wallet transfer receipt for reference in this conversation.',
      sourceTruthOwner: 'Wallet',
      mutationBoundary:
        'Chat displays the saved receipt snapshot. Wallet owns the transaction and receipt state; opening or discussing it does not move money.',
    },
  })
}
