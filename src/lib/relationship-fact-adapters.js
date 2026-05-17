export const RELATIONSHIP_FACT_SOURCE_KEYS = Object.freeze({
  SHOPPING_GIFT: 'relationship_shopping_gift',
  FOOD_DELIVERY_SHARED_MEAL: 'relationship_food_delivery_shared_meal',
  PHONE_CALL: 'relationship_phone_call',
  MAP_SHARED_ROUTE: 'relationship_map_shared_route',
  WALLET_SHARED_TRANSFER: 'relationship_wallet_shared_transfer',
})

const toInt = (value, fallback = 0) => {
  const num = Number(value)
  return Number.isFinite(num) ? Math.floor(num) : fallback
}

const normalizeText = (value, fallback = '', max = 160) => {
  if (typeof value !== 'string') return fallback
  const normalized = value.trim().replace(/\s+/g, ' ')
  if (!normalized) return fallback
  return normalized.slice(0, max)
}

const normalizeAmount = (value) => {
  const num = Number(value)
  if (!Number.isFinite(num) || num <= 0) return ''
  return num.toFixed(2)
}

const orderItemSummary = (items = [], fallback = 'order') => {
  if (!Array.isArray(items) || items.length === 0) return fallback
  return items
    .slice(0, 3)
    .map((item) => normalizeText(item.title || item.name, '', 48))
    .filter(Boolean)
    .join(' / ') || fallback
}

const relationshipTargetKey = (target = {}) => {
  const source = target && typeof target === 'object' ? target : {}
  return (
    (toInt(source.profileId ?? source.roleProfileId, 0) > 0 && `role_${toInt(source.profileId ?? source.roleProfileId, 0)}`) ||
    (toInt(source.contactId ?? source.id, 0) > 0 && `contact_${toInt(source.contactId ?? source.id, 0)}`) ||
    normalizeText(source.name || source.displayName, '', 80).toLowerCase().replace(/[^a-z0-9_-]+/gi, '_')
  )
}

const formatDurationSummary = (seconds) => {
  const total = Math.max(0, Math.floor(Number(seconds) || 0))
  const minutes = Math.floor(total / 60)
  const remain = total % 60
  if (minutes <= 0) return `${remain}s`
  return `${minutes}m ${remain}s`
}

export const resolveRelationshipTargetFromGiftRecipient = (giftRecipient = {}) => {
  const source = giftRecipient && typeof giftRecipient === 'object' ? giftRecipient : {}
  const profileId = toInt(source.profileId ?? source.roleProfileId, 0)
  const contactId = toInt(source.contactId ?? source.chatId, 0)
  const name = normalizeText(source.name || source.displayName || source.recipientName, '', 100)
  if (profileId <= 0 && contactId <= 0 && !name) return null
  return {
    profileId,
    contactId,
    kind: normalizeText(source.kind, profileId > 0 ? 'role' : 'contact', 40),
    name,
  }
}

export const resolveRelationshipTargetFromContact = (contact = {}) => {
  const source = contact && typeof contact === 'object' ? contact : {}
  const profileId = toInt(source.profileId, 0)
  const contactId = toInt(source.contactId ?? source.id, 0)
  const name = normalizeText(source.name || source.displayName, '', 100)
  if (profileId <= 0 && contactId <= 0 && !name) return null
  return {
    profileId,
    contactId,
    kind: normalizeText(source.kind, profileId > 0 ? 'role' : 'contact', 40),
    name,
  }
}

export const buildRelationshipSourceId = (...parts) =>
  parts
    .map((part) => normalizeText(String(part ?? ''), '', 80))
    .filter(Boolean)
    .join(':')

export const findRelationshipFactBySource = (relationshipRuntimeStore, sourceModule, sourceId) => {
  if (!relationshipRuntimeStore || typeof relationshipRuntimeStore.findEventBySource !== 'function') return null
  return relationshipRuntimeStore.findEventBySource(sourceModule, sourceId)
}

export const buildShoppingGiftRelationshipSuggestion = ({ relationshipRuntimeStore, order } = {}) => {
  const target = resolveRelationshipTargetFromGiftRecipient(order?.giftRecipient)
  const sourceId = buildRelationshipSourceId(order?.id, 'gift')
  const available = Boolean(target && sourceId)
  return {
    available,
    sourceModule: RELATIONSHIP_FACT_SOURCE_KEYS.SHOPPING_GIFT,
    sourceId,
    target,
    targetName: target?.name || '',
    imported: available
      ? Boolean(findRelationshipFactBySource(
          relationshipRuntimeStore,
          RELATIONSHIP_FACT_SOURCE_KEYS.SHOPPING_GIFT,
          sourceId,
        ))
      : false,
  }
}

export const recordShoppingGiftRelationshipFact = ({
  relationshipRuntimeStore,
  order,
  transaction,
  worldContext,
} = {}) => {
  const suggestion = buildShoppingGiftRelationshipSuggestion({ relationshipRuntimeStore, order })
  if (!relationshipRuntimeStore || !suggestion.available) return null
  const existing = findRelationshipFactBySource(
    relationshipRuntimeStore,
    RELATIONSHIP_FACT_SOURCE_KEYS.SHOPPING_GIFT,
    suggestion.sourceId,
  )
  if (existing) return existing

  const total = normalizeAmount(transaction?.amount ?? Number(order?.totalCents || 0) / 100)
  const currency = normalizeText(transaction?.currency || order?.currency, 'CNY', 8)
  const itemSummary = orderItemSummary(order?.items, 'gift order')
  const summary = total
    ? `Gift purchased for ${suggestion.targetName || 'a relationship contact'}: ${itemSummary} (${total} ${currency}).`
    : `Gift purchased for ${suggestion.targetName || 'a relationship contact'}: ${itemSummary}.`

  return relationshipRuntimeStore.recordRelationshipFact({
    target: suggestion.target,
    sourceModule: RELATIONSHIP_FACT_SOURCE_KEYS.SHOPPING_GIFT,
    sourceId: suggestion.sourceId,
    factType: 'gift_purchased',
    summary,
    intensity: 2,
    metricDeltas: {
      affinity: 8,
      trust: 3,
      intimacy: 4,
    },
    milestone: 'Gift purchase recorded',
    growthTraits: ['gift-memory', 'shopping'],
    worldContext,
  })
}

export const buildFoodDeliverySharedMealRelationshipSuggestion = ({
  relationshipRuntimeStore,
  order,
  target,
} = {}) => {
  const resolvedTarget = resolveRelationshipTargetFromContact(target)
  const targetKey = resolvedTarget?.profileId || resolvedTarget?.contactId || resolvedTarget?.name || ''
  const sourceId = buildRelationshipSourceId(order?.id, 'shared_meal', targetKey)
  const available = Boolean(resolvedTarget && sourceId)
  return {
    available,
    sourceModule: RELATIONSHIP_FACT_SOURCE_KEYS.FOOD_DELIVERY_SHARED_MEAL,
    sourceId,
    target: resolvedTarget,
    targetName: resolvedTarget?.name || '',
    imported: available
      ? Boolean(findRelationshipFactBySource(
          relationshipRuntimeStore,
          RELATIONSHIP_FACT_SOURCE_KEYS.FOOD_DELIVERY_SHARED_MEAL,
          sourceId,
        ))
      : false,
  }
}

export const recordFoodDeliverySharedMealRelationshipFact = ({
  relationshipRuntimeStore,
  order,
  target,
  transaction,
  worldContext,
} = {}) => {
  const suggestion = buildFoodDeliverySharedMealRelationshipSuggestion({
    relationshipRuntimeStore,
    order,
    target,
  })
  if (!relationshipRuntimeStore || !suggestion.available) return null
  const existing = findRelationshipFactBySource(
    relationshipRuntimeStore,
    RELATIONSHIP_FACT_SOURCE_KEYS.FOOD_DELIVERY_SHARED_MEAL,
    suggestion.sourceId,
  )
  if (existing) return existing

  const restaurant = normalizeText(order?.restaurantName || transaction?.counterparty, 'Food Delivery', 100)
  const total = normalizeAmount(transaction?.amount ?? Number(order?.totalCents || 0) / 100)
  const currency = normalizeText(transaction?.currency || order?.currency, 'CNY', 8)
  const itemSummary = orderItemSummary(order?.items, 'meal order')
  const summary = total
    ? `Shared meal recorded with ${suggestion.targetName || 'a relationship contact'} from ${restaurant}: ${itemSummary} (${total} ${currency}).`
    : `Shared meal recorded with ${suggestion.targetName || 'a relationship contact'} from ${restaurant}: ${itemSummary}.`

  return relationshipRuntimeStore.recordRelationshipFact({
    target: suggestion.target,
    sourceModule: RELATIONSHIP_FACT_SOURCE_KEYS.FOOD_DELIVERY_SHARED_MEAL,
    sourceId: suggestion.sourceId,
    factType: 'shared_meal',
    summary,
    intensity: 2,
    metricDeltas: {
      affinity: 6,
      trust: 2,
      intimacy: 5,
    },
    milestone: 'Shared meal recorded',
    growthTraits: ['shared-meal', 'food-delivery'],
    worldContext,
  })
}

export const buildPhoneCallRelationshipSuggestion = ({
  relationshipRuntimeStore,
  call,
  target,
} = {}) => {
  const resolvedTarget = resolveRelationshipTargetFromContact(target)
  const sourceId = buildRelationshipSourceId(call?.id, 'call', relationshipTargetKey(resolvedTarget))
  const available = Boolean(resolvedTarget && sourceId)
  return {
    available,
    sourceModule: RELATIONSHIP_FACT_SOURCE_KEYS.PHONE_CALL,
    sourceId,
    target: resolvedTarget,
    targetName: resolvedTarget?.name || '',
    imported: available
      ? Boolean(findRelationshipFactBySource(
          relationshipRuntimeStore,
          RELATIONSHIP_FACT_SOURCE_KEYS.PHONE_CALL,
          sourceId,
        ))
      : false,
  }
}

export const recordPhoneCallRelationshipFact = ({
  relationshipRuntimeStore,
  call,
  target,
  worldContext,
} = {}) => {
  const suggestion = buildPhoneCallRelationshipSuggestion({ relationshipRuntimeStore, call, target })
  if (!relationshipRuntimeStore || !suggestion.available) return null
  const existing = findRelationshipFactBySource(
    relationshipRuntimeStore,
    RELATIONSHIP_FACT_SOURCE_KEYS.PHONE_CALL,
    suggestion.sourceId,
  )
  if (existing) return existing

  const isMissed = call?.status === 'missed' || call?.direction === 'missed'
  const direction = normalizeText(call?.direction, isMissed ? 'missed' : 'completed', 40)
  const duration = formatDurationSummary(call?.durationSec)
  const summary = isMissed
    ? `Missed call noted from ${suggestion.targetName || 'a relationship contact'}.`
    : `Call recorded with ${suggestion.targetName || 'a relationship contact'} (${direction}, ${duration}).`

  return relationshipRuntimeStore.recordRelationshipFact({
    target: suggestion.target,
    sourceModule: RELATIONSHIP_FACT_SOURCE_KEYS.PHONE_CALL,
    sourceId: suggestion.sourceId,
    factType: isMissed ? 'missed_call' : 'completed_call',
    summary,
    intensity: isMissed ? 1 : 2,
    metricDeltas: isMissed
      ? {
          tension: 2,
        }
      : {
          affinity: 4,
          trust: 2,
          intimacy: 2,
        },
    milestone: isMissed ? '' : 'Call recorded',
    growthTraits: isMissed ? ['missed-call', 'phone'] : ['call-memory', 'phone'],
    worldContext,
  })
}

export const buildMapSharedRouteRelationshipSuggestion = ({
  relationshipRuntimeStore,
  trip,
  target,
} = {}) => {
  const resolvedTarget = resolveRelationshipTargetFromContact(target)
  const sourceId = buildRelationshipSourceId(trip?.id, 'shared_route', relationshipTargetKey(resolvedTarget))
  const available = Boolean(resolvedTarget && sourceId)
  return {
    available,
    sourceModule: RELATIONSHIP_FACT_SOURCE_KEYS.MAP_SHARED_ROUTE,
    sourceId,
    target: resolvedTarget,
    targetName: resolvedTarget?.name || '',
    imported: available
      ? Boolean(findRelationshipFactBySource(
          relationshipRuntimeStore,
          RELATIONSHIP_FACT_SOURCE_KEYS.MAP_SHARED_ROUTE,
          sourceId,
        ))
      : false,
  }
}

export const recordMapSharedRouteRelationshipFact = ({
  relationshipRuntimeStore,
  trip,
  target,
  worldContext,
} = {}) => {
  const suggestion = buildMapSharedRouteRelationshipSuggestion({ relationshipRuntimeStore, trip, target })
  if (!relationshipRuntimeStore || !suggestion.available) return null
  const existing = findRelationshipFactBySource(
    relationshipRuntimeStore,
    RELATIONSHIP_FACT_SOURCE_KEYS.MAP_SHARED_ROUTE,
    suggestion.sourceId,
  )
  if (existing) return existing

  const from = normalizeText(trip?.fromLabel || trip?.from, 'start', 80)
  const to = normalizeText(trip?.toLabel || trip?.to, 'destination', 80)
  const distance = normalizeAmount(trip?.distanceKm)
  const summary = distance
    ? `Shared route completed with ${suggestion.targetName || 'a relationship contact'}: ${from} to ${to} (${distance} km).`
    : `Shared route completed with ${suggestion.targetName || 'a relationship contact'}: ${from} to ${to}.`

  return relationshipRuntimeStore.recordRelationshipFact({
    target: suggestion.target,
    sourceModule: RELATIONSHIP_FACT_SOURCE_KEYS.MAP_SHARED_ROUTE,
    sourceId: suggestion.sourceId,
    factType: 'shared_route',
    summary,
    intensity: 2,
    metricDeltas: {
      affinity: 5,
      trust: 2,
      intimacy: 3,
    },
    milestone: 'Shared route recorded',
    growthTraits: ['shared-route', 'map'],
    worldContext,
  })
}

export const buildWalletSharedTransferRelationshipSuggestion = ({
  relationshipRuntimeStore,
  transaction,
  target,
} = {}) => {
  const resolvedTarget = resolveRelationshipTargetFromContact(target)
  const sourceId = buildRelationshipSourceId(transaction?.id || transaction?.sourceId, 'shared_transfer', relationshipTargetKey(resolvedTarget))
  const available = Boolean(resolvedTarget && sourceId)
  return {
    available,
    sourceModule: RELATIONSHIP_FACT_SOURCE_KEYS.WALLET_SHARED_TRANSFER,
    sourceId,
    target: resolvedTarget,
    targetName: resolvedTarget?.name || '',
    imported: available
      ? Boolean(findRelationshipFactBySource(
          relationshipRuntimeStore,
          RELATIONSHIP_FACT_SOURCE_KEYS.WALLET_SHARED_TRANSFER,
          sourceId,
        ))
      : false,
  }
}

export const recordWalletSharedTransferRelationshipFact = ({
  relationshipRuntimeStore,
  transaction,
  target,
  worldContext,
} = {}) => {
  const suggestion = buildWalletSharedTransferRelationshipSuggestion({
    relationshipRuntimeStore,
    transaction,
    target,
  })
  if (!relationshipRuntimeStore || !suggestion.available) return null
  const existing = findRelationshipFactBySource(
    relationshipRuntimeStore,
    RELATIONSHIP_FACT_SOURCE_KEYS.WALLET_SHARED_TRANSFER,
    suggestion.sourceId,
  )
  if (existing) return existing

  const amount = normalizeAmount(Number(transaction?.amountCents || 0) / 100 || transaction?.amount)
  const currency = normalizeText(transaction?.currency, 'CNY', 8)
  const title = normalizeText(transaction?.title || transaction?.note, 'virtual transfer', 100)
  const factType = transaction?.type === 'expense' ? 'shared_expense' : 'transfer_recorded'
  const summary = amount
    ? `Wallet interaction recorded with ${suggestion.targetName || 'a relationship contact'}: ${title} (${amount} ${currency}).`
    : `Wallet interaction recorded with ${suggestion.targetName || 'a relationship contact'}: ${title}.`

  return relationshipRuntimeStore.recordRelationshipFact({
    target: suggestion.target,
    sourceModule: RELATIONSHIP_FACT_SOURCE_KEYS.WALLET_SHARED_TRANSFER,
    sourceId: suggestion.sourceId,
    factType,
    summary,
    intensity: 2,
    metricDeltas: {
      affinity: 3,
      trust: 4,
      dependency: 1,
    },
    milestone: 'Wallet interaction recorded',
    growthTraits: ['shared-expense', 'wallet'],
    worldContext,
  })
}
