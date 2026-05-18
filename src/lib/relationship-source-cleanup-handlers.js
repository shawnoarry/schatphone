import { RELATIONSHIP_FACT_SOURCE_KEYS } from './relationship-fact-adapters'
import { RELATIONSHIP_CLEANUP_MODES } from './relationship-cleanup-helpers'

export const sourceRecordIdFromRelationshipSourceId = (sourceId = '') => {
  const value = typeof sourceId === 'string' ? sourceId.trim() : ''
  return value.split(':')[0] || value
}

const translate = (t, zh, en) => (typeof t === 'function' ? t(zh, en) : en)

const updatedSourceResult = ({ ok = true, existed = false, removedCount = 0 } = {}) => ({
  ok,
  removedCount,
  unlinkedCount: existed && !removedCount ? 1 : 0,
  anonymizedCount: existed && !removedCount ? 1 : 0,
  updatedCount: existed && !removedCount ? 1 : 0,
})

export const createRelationshipSourceCleanupHandlers = ({
  phoneStore,
  shoppingStore,
  foodDeliveryStore,
  walletStore,
  calendarStore,
  mapStore,
  t,
} = {}) => ({
  [RELATIONSHIP_FACT_SOURCE_KEYS.PHONE_CALL]: (sourceId, ref, options = {}) => {
    const cleanupMode = options.cleanupMode || RELATIONSHIP_CLEANUP_MODES.DELETE_ROLE
    const recordId = sourceRecordIdFromRelationshipSourceId(sourceId)
    const existed = Boolean(phoneStore?.findCallById?.(recordId))
    if (cleanupMode === RELATIONSHIP_CLEANUP_MODES.DELETE_ROLE) {
      const removed = existed ? phoneStore.removeCallLog(recordId) : true
      return {
        ok: removed,
        removedCount: existed && !phoneStore.findCallById(recordId) ? 1 : 0,
      }
    }
    const ok =
      !existed ||
      phoneStore.anonymizeCallLog(
        recordId,
        options.profile,
        translate(t, '未知来电', 'Unknown caller'),
      )
    return updatedSourceResult({ ok, existed })
  },
  [RELATIONSHIP_FACT_SOURCE_KEYS.SHOPPING_GIFT]: (sourceId, ref, options = {}) => {
    const cleanupMode = options.cleanupMode || RELATIONSHIP_CLEANUP_MODES.DELETE_ROLE
    const recordId = sourceRecordIdFromRelationshipSourceId(sourceId)
    const existed = Boolean(shoppingStore?.findOrderById?.(recordId))
    if (cleanupMode === RELATIONSHIP_CLEANUP_MODES.DELETE_ROLE) {
      const removed = !existed || shoppingStore.removeOrder(recordId)
      return {
        ok: removed,
        removedCount: existed && !shoppingStore.findOrderById(recordId) ? 1 : 0,
      }
    }
    const ok =
      !existed ||
      shoppingStore.neutralizeRelationshipOrder(
        recordId,
        options.profile,
        translate(t, '某人', 'Someone'),
      )
    return updatedSourceResult({ ok, existed })
  },
  [RELATIONSHIP_FACT_SOURCE_KEYS.FOOD_DELIVERY_SHARED_MEAL]: (sourceId, ref, options = {}) => {
    const cleanupMode = options.cleanupMode || RELATIONSHIP_CLEANUP_MODES.DELETE_ROLE
    const recordId = sourceRecordIdFromRelationshipSourceId(sourceId)
    const existed = Boolean(foodDeliveryStore?.findOrderById?.(recordId))
    if (cleanupMode === RELATIONSHIP_CLEANUP_MODES.DELETE_ROLE) {
      const removed = !existed || foodDeliveryStore.removeOrder(recordId)
      return {
        ok: removed,
        removedCount: existed && !foodDeliveryStore.findOrderById(recordId) ? 1 : 0,
      }
    }
    const ok =
      !existed ||
      foodDeliveryStore.neutralizeRelationshipOrder(
        recordId,
        options.profile,
        translate(t, '某人', 'Someone'),
      )
    return updatedSourceResult({ ok, existed })
  },
  [RELATIONSHIP_FACT_SOURCE_KEYS.WALLET_SHARED_TRANSFER]: (sourceId, ref, options = {}) => {
    const cleanupMode = options.cleanupMode || RELATIONSHIP_CLEANUP_MODES.DELETE_ROLE
    const recordId = sourceRecordIdFromRelationshipSourceId(sourceId)
    const existed = Boolean(walletStore?.findTransactionById?.(recordId))
    if (cleanupMode === RELATIONSHIP_CLEANUP_MODES.DELETE_ROLE) {
      const removed = existed ? walletStore.removeTransaction(recordId) : true
      return {
        ok: removed,
        removedCount: existed && !walletStore.findTransactionById(recordId) ? 1 : 0,
      }
    }
    const ok =
      !existed ||
      walletStore.anonymizeTransaction(
        recordId,
        options.profile,
        translate(t, '未知对方', 'Unknown counterparty'),
      )
    return updatedSourceResult({ ok, existed })
  },
  [RELATIONSHIP_FACT_SOURCE_KEYS.WALLET_ORDER_SUPPORT]: (sourceId, ref, options = {}) => {
    const recordId = sourceRecordIdFromRelationshipSourceId(sourceId)
    const existed = Boolean(walletStore?.findTransactionById?.(recordId))
    const ok =
      !existed ||
      walletStore.anonymizeTransaction(
        recordId,
        options.profile,
        translate(t, '未知对方', 'Unknown counterparty'),
      )
    return updatedSourceResult({ ok, existed })
  },
  [RELATIONSHIP_FACT_SOURCE_KEYS.CALENDAR_CONFIRMED_EVENT]: (sourceId, ref, options = {}) => {
    const cleanupMode = options.cleanupMode || RELATIONSHIP_CLEANUP_MODES.DELETE_ROLE
    const recordId = sourceRecordIdFromRelationshipSourceId(sourceId)
    const existed = Boolean(calendarStore?.findEventById?.(recordId))
    if (cleanupMode === RELATIONSHIP_CLEANUP_MODES.DELETE_ROLE) {
      const removed = !existed || calendarStore.removeEventById(recordId)
      return {
        ok: removed,
        removedCount: existed && !calendarStore.findEventById(recordId) ? 1 : 0,
      }
    }
    const ok =
      !existed ||
      calendarStore.clearRelationshipBindingForEvent(
        recordId,
        options.profile,
        translate(t, '某人', 'Someone'),
      )
    return updatedSourceResult({ ok, existed })
  },
  [RELATIONSHIP_FACT_SOURCE_KEYS.MAP_SHARED_ROUTE]: (sourceId, ref, options = {}) => {
    const cleanupMode = options.cleanupMode || RELATIONSHIP_CLEANUP_MODES.DELETE_ROLE
    const recordId = sourceRecordIdFromRelationshipSourceId(sourceId)
    const tripExists = () => Boolean(mapStore?.tripHistory?.some((trip) => trip.id === recordId))
    const existed = tripExists()
    if (cleanupMode === RELATIONSHIP_CLEANUP_MODES.DELETE_ROLE) {
      const removed = !existed || mapStore.removeTripHistoryItem(recordId)
      return {
        ok: removed,
        removedCount: existed && !tripExists() ? 1 : 0,
      }
    }
    const ok =
      !existed ||
      mapStore.neutralizeRelationshipTrip(
        recordId,
        options.profile,
        translate(t, '某人', 'Someone'),
      )
    return updatedSourceResult({ ok, existed })
  },
})

export const sourceModuleSummaryText = (sourceModuleCounts = {}, t) => {
  const entries = Object.entries(sourceModuleCounts || {})
  if (entries.length === 0) return translate(t, '无跨模块源记录', 'No cross-module source records')
  return entries.map(([module, count]) => `${module} ${count}`).join(' · ')
}

export const cleanupCoverageText = (sourceModuleCounts = {}, cleanupHandlers = {}, t) => {
  const entries = Object.entries(sourceModuleCounts || {})
  if (entries.length === 0) {
    return translate(t, '无需跨模块源记录清理。', 'No cross-module source records need cleanup.')
  }
  const handled = entries.filter(([module]) => typeof cleanupHandlers[module] === 'function')
  const pending = entries.filter(([module]) => typeof cleanupHandlers[module] !== 'function')
  return [
    handled.length
      ? `${translate(t, '已接入清理', 'Cleanup connected')}: ${handled.map(([module, count]) => `${module} ${count}`).join(' · ')}`
      : '',
    pending.length
      ? `${translate(t, '待产品口径确认', 'Pending product decision')}: ${pending.map(([module, count]) => `${module} ${count}`).join(' · ')}`
      : '',
  ].filter(Boolean).join(' · ')
}

export const cleanupResultSummaryText = (cleanupResult, t) => {
  if (!cleanupResult) return ''
  return translate(
    t,
    `跨模块清理：删除 ${cleanupResult.removedCount || 0}，解绑 ${cleanupResult.unlinkedCount || 0}，匿名/改写 ${cleanupResult.anonymizedCount || 0}，跳过 ${cleanupResult.skippedCount || 0}，失败 ${cleanupResult.failedCount || 0}`,
    `Cross-module cleanup: ${cleanupResult.removedCount || 0} removed, ${cleanupResult.unlinkedCount || 0} unlinked, ${cleanupResult.anonymizedCount || 0} anonymized, ${cleanupResult.skippedCount || 0} skipped, ${cleanupResult.failedCount || 0} failed`,
  )
}
