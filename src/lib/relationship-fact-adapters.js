import { SHOPPING_SOURCE_KEYS } from './planned-module-registry'
import { buildRelationshipFactGate } from './relationship-event-gating'

export const RELATIONSHIP_FACT_SOURCE_KEYS = Object.freeze({
  SHOPPING_GIFT: 'relationship_shopping_gift',
  FOOD_DELIVERY_SHARED_MEAL: 'relationship_food_delivery_shared_meal',
  WALLET_ORDER_SUPPORT: 'relationship_wallet_order_support',
  PHONE_CALL: 'relationship_phone_call',
  MAP_SHARED_ROUTE: 'relationship_map_shared_route',
  WALLET_SHARED_TRANSFER: 'relationship_wallet_shared_transfer',
  CALENDAR_CONFIRMED_EVENT: 'relationship_calendar_confirmed_event',
})

const LOW_RISK_RELATIONSHIP_GATE_CATEGORIES = Object.freeze([
  'ordinary_acquaintance',
  'family_bond',
  'friendship_bond',
  'romance_candidate',
  'romantic_bond',
  'mentor_bond',
  'professional_bond',
  'power_bond',
  'fandom_bond',
  'rival_bond',
])

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

const lowRiskRelationshipGate = ({ chatStore, target, factType }) =>
  buildRelationshipFactGate({
    chatStore,
    target,
    factType,
    risk: 'low',
    rule: {
      preferredPrimaryCategoryIds: LOW_RISK_RELATIONSHIP_GATE_CATEGORIES,
    },
  })

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

const stripKnownPrefix = (value, prefix) => {
  const normalizedValue = normalizeText(value, '', 160)
  const normalizedPrefix = normalizeText(prefix, '', 80)
  if (!normalizedValue || !normalizedPrefix) return ''
  return normalizedValue.startsWith(normalizedPrefix)
    ? normalizedValue.slice(normalizedPrefix.length)
    : ''
}

const resolveShoppingCalendarOrderId = (event = {}) => {
  const sourceReminderId = normalizeText(event?.sourceReminderId, '', 160)
  const fromReminder = stripKnownPrefix(sourceReminderId, 'shopping_delivery_cue_')
  if (fromReminder) return fromReminder

  const eventId = normalizeText(event?.id, '', 160)
  const eventReminderId = stripKnownPrefix(eventId, 'calendar_event_')
  const fromEventId = stripKnownPrefix(eventReminderId, 'shopping_delivery_cue_')
  if (fromEventId) return fromEventId

  return ''
}

const resolveCalendarEventMemoryKey = (event = {}, fallbackSourceId = '') => {
  const source = normalizeText(event?.source, '', 80)
  const sourceReminderId = normalizeText(event?.sourceReminderId, '', 160)

  if (source === 'phone_missed_call') {
    const callId = stripKnownPrefix(sourceReminderId, 'phone_missed_call_cue_')
    return buildRelationshipMemoryKey('phone_call', callId || sourceReminderId || event?.id || fallbackSourceId)
  }

  if (source === 'map_calendar_reminder') {
    const sourceTripId = normalizeText(event?.sourceTripId, '', 160)
    if (sourceTripId) {
      return buildRelationshipMemoryKey('shared_route', sourceTripId)
    }
    return buildRelationshipMemoryKey(
      'map_reminder',
      event?.sourceAreaId || sourceReminderId || event?.id || fallbackSourceId,
    )
  }

  if (source === SHOPPING_SOURCE_KEYS.CALENDAR_DELIVERY) {
    return buildRelationshipMemoryKey(
      'shopping_gift',
      resolveShoppingCalendarOrderId(event) || sourceReminderId || event?.id || fallbackSourceId,
    )
  }

  return buildRelationshipMemoryKey(
    'calendar_event',
    sourceReminderId || event?.id || fallbackSourceId,
  )
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

export const buildRelationshipMemoryKey = (...parts) =>
  parts
    .map((part) => normalizeText(String(part ?? ''), '', 80).toLowerCase().replace(/[^a-z0-9_-]+/gi, '_'))
    .filter(Boolean)
    .join('__')

export const buildShoppingGiftRelationshipMemoryKey = (order = {}) =>
  buildRelationshipMemoryKey('shopping_gift', order?.id)

export const buildFoodDeliverySharedMealRelationshipMemoryKey = (order = {}) =>
  buildRelationshipMemoryKey('food_shared_meal', order?.id)

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
  chatStore,
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
    memoryKey: buildShoppingGiftRelationshipMemoryKey(order || { id: suggestion.sourceId }),
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
    relationshipGate: lowRiskRelationshipGate({
      chatStore,
      target: suggestion.target,
      factType: 'gift_purchased',
    }),
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
  chatStore,
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
    memoryKey: buildFoodDeliverySharedMealRelationshipMemoryKey(order || { id: suggestion.sourceId }),
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
    relationshipGate: lowRiskRelationshipGate({
      chatStore,
      target: suggestion.target,
      factType: 'shared_meal',
    }),
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
  chatStore,
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
    memoryKey: buildRelationshipMemoryKey('phone_call', call?.id || suggestion.sourceId),
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
    relationshipGate: lowRiskRelationshipGate({
      chatStore,
      target: suggestion.target,
      factType: isMissed ? 'missed_call' : 'completed_call',
    }),
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
  chatStore,
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
    memoryKey: buildRelationshipMemoryKey('shared_route', trip?.id || suggestion.sourceId),
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
    relationshipGate: lowRiskRelationshipGate({
      chatStore,
      target: suggestion.target,
      factType: 'shared_route',
    }),
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
  chatStore,
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
    memoryKey: buildRelationshipMemoryKey('wallet_transfer', transaction?.id || transaction?.sourceId || suggestion.sourceId),
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
    relationshipGate: lowRiskRelationshipGate({
      chatStore,
      target: suggestion.target,
      factType,
    }),
  })
}

export const recordWalletOrderSupportRelationshipFact = ({
  chatStore,
  relationshipRuntimeStore,
  target,
  transaction,
  memoryKey = '',
  summary = '',
  worldContext,
} = {}) => {
  const resolvedTarget = resolveRelationshipTargetFromContact(target)
  const resolvedMemoryKey = normalizeText(memoryKey, '', 160)
  const transactionSourceId = normalizeText(transaction?.id || transaction?.sourceId, '', 140)
  if (!relationshipRuntimeStore || !resolvedTarget || !resolvedMemoryKey || !transactionSourceId) return null

  const sourceId = buildRelationshipSourceId(transactionSourceId, 'wallet_support', relationshipTargetKey(resolvedTarget))
  const existing = findRelationshipFactBySource(
    relationshipRuntimeStore,
    RELATIONSHIP_FACT_SOURCE_KEYS.WALLET_ORDER_SUPPORT,
    sourceId,
  )
  if (existing) return existing

  const amount = normalizeAmount(Number(transaction?.amountCents || 0) / 100 || transaction?.amount)
  const currency = normalizeText(transaction?.currency, 'CNY', 8)
  const normalizedSummary = normalizeText(summary, '', 220) || (
    amount
      ? `Wallet support recorded with ${resolvedTarget.name || 'a relationship contact'}: ${amount} ${currency}.`
      : `Wallet support recorded with ${resolvedTarget.name || 'a relationship contact'}.`
  )

  return relationshipRuntimeStore.recordRelationshipFact({
    target: resolvedTarget,
    sourceModule: RELATIONSHIP_FACT_SOURCE_KEYS.WALLET_ORDER_SUPPORT,
    sourceId,
    memoryKey: resolvedMemoryKey,
    factType: 'wallet_order_support',
    summary: normalizedSummary,
    intensity: 1,
    metricDeltas: {},
    growthTraits: ['wallet-support'],
    worldContext,
    forceSupportingMemory: true,
    relationshipGate: lowRiskRelationshipGate({
      chatStore,
      target: resolvedTarget,
      factType: 'wallet_order_support',
    }),
  })
}

export const buildCalendarConfirmedEventRelationshipSuggestion = ({
  relationshipRuntimeStore,
  event,
  target,
} = {}) => {
  const resolvedTarget = resolveRelationshipTargetFromContact(target || event?.relationshipTarget)
  const sourceId = buildRelationshipSourceId(
    event?.id,
    'calendar_event',
    relationshipTargetKey(resolvedTarget),
  )
  const available = Boolean(resolvedTarget && sourceId && event?.status === 'confirmed')
  return {
    available,
    sourceModule: RELATIONSHIP_FACT_SOURCE_KEYS.CALENDAR_CONFIRMED_EVENT,
    sourceId,
    target: resolvedTarget,
    targetName: resolvedTarget?.name || '',
    imported: available
      ? Boolean(findRelationshipFactBySource(
          relationshipRuntimeStore,
          RELATIONSHIP_FACT_SOURCE_KEYS.CALENDAR_CONFIRMED_EVENT,
          sourceId,
        ))
      : false,
  }
}

export const recordCalendarConfirmedEventRelationshipFact = ({
  chatStore,
  relationshipRuntimeStore,
  event,
  target,
  worldContext,
} = {}) => {
  const suggestion = buildCalendarConfirmedEventRelationshipSuggestion({
    relationshipRuntimeStore,
    event,
    target,
  })
  if (!relationshipRuntimeStore || !suggestion.available) return null
  const existing = findRelationshipFactBySource(
    relationshipRuntimeStore,
    RELATIONSHIP_FACT_SOURCE_KEYS.CALENDAR_CONFIRMED_EVENT,
    suggestion.sourceId,
  )
  if (existing) return existing

  const title = normalizeText(event?.titleEn || event?.titleZh, 'Calendar event', 100)
  const date = toInt(event?.startsAt, 0) > 0
    ? new Date(toInt(event.startsAt, 0)).toISOString().slice(0, 10)
    : ''
  const summary = date
    ? `Calendar plan recorded with ${suggestion.targetName || 'a relationship contact'}: ${title} on ${date}.`
    : `Calendar plan recorded with ${suggestion.targetName || 'a relationship contact'}: ${title}.`

  return relationshipRuntimeStore.recordRelationshipFact({
    target: suggestion.target,
    sourceModule: RELATIONSHIP_FACT_SOURCE_KEYS.CALENDAR_CONFIRMED_EVENT,
    sourceId: suggestion.sourceId,
    memoryKey: resolveCalendarEventMemoryKey(event, suggestion.sourceId),
    factType: 'scheduled_calendar_event',
    summary,
    intensity: 2,
    metricDeltas: {
      affinity: 4,
      trust: 2,
      intimacy: 2,
    },
    milestone: 'Calendar plan recorded',
    growthTraits: ['calendar-plan', 'schedule'],
    worldContext,
    relationshipGate: lowRiskRelationshipGate({
      chatStore,
      target: suggestion.target,
      factType: 'scheduled_calendar_event',
    }),
  })
}
