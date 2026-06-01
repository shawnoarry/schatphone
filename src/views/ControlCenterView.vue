<script setup>
import { computed, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from '../composables/useI18n'
import { pushReturnTarget } from '../lib/navigation-return'
import { useDialog } from '../composables/useDialog'
import {
  buildRoleDeleteImpact,
  cleanupRelationshipSourceRecords,
  deleteRoleMemoryGroup,
  resetRoleRelationshipState,
} from '../lib/contacts-relationship-actions'
import {
  cleanupCoverageText,
  cleanupResultSummaryText,
  createRelationshipSourceCleanupHandlers,
  sourceModuleSummaryText,
} from '../lib/relationship-source-cleanup-handlers'
import {
  RELATIONSHIP_EVENT_STATUS,
  RELATIONSHIP_MEMORY_REVIEW_STATES,
  useRelationshipRuntimeStore,
} from '../stores/relationshipRuntime'
import { RELATIONSHIP_CLEANUP_MODES } from '../lib/relationship-cleanup-helpers'
import { useCalendarStore } from '../stores/calendar'
import { useChatStore } from '../stores/chat'
import { useFoodDeliveryStore } from '../stores/foodDelivery'
import { useMapStore } from '../stores/map'
import { usePhoneStore } from '../stores/phone'
import { useShoppingStore } from '../stores/shopping'
import { useSystemStore } from '../stores/system'
import { useWalletStore } from '../stores/wallet'
import {
  SIMULATION_EVENT_STATUS,
  SIMULATION_SURPRISE_MODE,
  useSimulationStore,
} from '../stores/simulation'
import {
  CHAT_SOCIAL_EVENT_STATUS,
  CHAT_SOCIAL_EVENT_TYPES,
} from '../lib/chat-social-event-review'
import { CONTROL_CENTER_HOME_APP_ID } from '../lib/planned-module-registry'

const router = useRouter()
const route = useRoute()
const { t } = useI18n()
const { confirmDialog, promptDialog } = useDialog()
const calendarStore = useCalendarStore()
const chatStore = useChatStore()
const foodDeliveryStore = useFoodDeliveryStore()
const mapStore = useMapStore()
const phoneStore = usePhoneStore()
const systemStore = useSystemStore()
const shoppingStore = useShoppingStore()
const walletStore = useWalletStore()
const relationshipRuntimeStore = useRelationshipRuntimeStore()
const simulationStore = useSimulationStore()

const eventLogModuleFilter = ref('all')
const eventLogStatusFilter = ref('all')
const selectedEventLogId = ref('')
const relationshipEventStatusFilter = ref('all')
const relationshipEventSourceFilter = ref('all')
const selectedRelationshipEventId = ref('')
const selectedChatSocialEventId = ref('')

const { settings } = storeToRefs(systemStore)
const {
  entityCount: relationshipEntityCount,
  pendingEventCount: pendingRelationshipEventCount,
} = storeToRefs(relationshipRuntimeStore)
const {
  eventLogCount,
  recentEventLogs,
  activeCooldownCount,
  surpriseMode,
  pendingChatSocialEventProposalCount,
} = storeToRefs(simulationStore)

const WORLD_HUB_RUNTIME_MODULES = Object.freeze([
  {
    key: 'food_delivery',
    label: 'Food Delivery',
    description: 'Safe random pilot is wired for ETA updates and rider delays.',
  },
  {
    key: 'shopping',
    label: 'Shopping / Logistics',
    description: 'Logistics presets use the shared engine; runtime random remains off.',
  },
  {
    key: 'map',
    label: 'Map',
    description: 'Reads delivery location and ETA context without auto trips.',
  },
  {
    key: 'chat',
    label: 'Chat',
    description: 'Service accounts read event summaries without owning writes.',
  },
  {
    key: 'calendar',
    label: 'Calendar',
    description: 'Future owner for reminders, quests, and unlock schedules.',
  },
  {
    key: 'wallet',
    label: 'Wallet',
    description: 'Future owner for funds, expense suggestions, and ledger events.',
  },
  {
    key: 'assets',
    label: 'Assets',
    description: 'Future owner for property, vehicle, investment, and asset events.',
  },
])

const homeEntryVisible = computed(
  () => (settings.value.appearance?.homeWidgetPages || []).some(
    (page) => Array.isArray(page) && page.includes(CONTROL_CENTER_HOME_APP_ID),
  ),
)

const surpriseModeLabel = computed(() => {
  if (surpriseMode.value === SIMULATION_SURPRISE_MODE.OFF) return t('Off', 'Off')
  if (surpriseMode.value === SIMULATION_SURPRISE_MODE.BALANCED) return t('Balanced', 'Balanced')
  if (surpriseMode.value === SIMULATION_SURPRISE_MODE.HIGH) return t('High', 'High')
  return t('Low', 'Low')
})

const recentRuntimeStatusCounts = computed(() => {
  const logs = Array.isArray(recentEventLogs.value) ? recentEventLogs.value : []
  return {
    triggered: logs.filter((log) => log.status === SIMULATION_EVENT_STATUS.TRIGGERED).length,
    skipped: logs.filter((log) => log.status === SIMULATION_EVENT_STATUS.SKIPPED).length,
    failed: logs.filter((log) => log.status === SIMULATION_EVENT_STATUS.FAILED).length,
  }
})

const runtimeStats = computed(() => [
  {
    id: 'surprise-mode',
    label: t('Surprise mode', 'Surprise mode'),
    value: surpriseModeLabel.value,
    hint: t('Controls random-event intensity; off blocks automatic triggers.', 'Controls random-event intensity; off blocks automatic triggers.'),
  },
  {
    id: 'event-logs',
    label: t('Event logs', 'Event logs'),
    value: String(eventLogCount.value),
    hint: t('Total logs written by the shared event engine.', 'Total logs written by the shared event engine.'),
  },
  {
    id: 'recent-triggered',
    label: t('Recent triggered', 'Recent triggered'),
    value: String(recentRuntimeStatusCounts.value.triggered),
    hint: t('Triggered entries in the latest 24 logs.', 'Triggered entries in the latest 24 logs.'),
  },
  {
    id: 'active-cooldowns',
    label: t('Active cooldowns', 'Active cooldowns'),
    value: String(activeCooldownCount.value),
    hint: t('Prevents similar events from repeating too quickly.', 'Prevents similar events from repeating too quickly.'),
  },
  {
    id: 'pending-chat-social',
    label: t('Pending Chat social', 'Pending Chat social'),
    value: String(pendingChatSocialEventProposalCount.value),
    hint: t('Role-initiated block/refusal changes wait here before Chat changes.', 'Role-initiated block/refusal changes wait here before Chat changes.'),
  },
])

const moduleRuntimeStatuses = computed(() =>
  WORLD_HUB_RUNTIME_MODULES.map((item) => ({
    ...item,
    label: t(item.label, item.label),
    description: t(item.description, item.description),
    enabled: simulationStore.isModuleEventsEnabled(item.key),
    statusLabel: simulationStore.isModuleEventsEnabled(item.key) ? t('On', 'On') : t('Off', 'Off'),
  })),
)

const worldRuntimeSummary = computed(() => {
  const logs = Array.isArray(recentEventLogs.value) ? recentEventLogs.value : []
  const worldLogs = logs.filter((log) =>
    Boolean(
      log.worldContextId ||
        log.variantId ||
        log.variantPackId ||
        (Array.isArray(log.activeWorldBookIds) && log.activeWorldBookIds.length > 0),
    ),
  )
  const latest = worldLogs[0] || null
  return {
    count: worldLogs.length,
    worldContextId: latest?.worldContextId || t('None yet', 'None yet'),
    variantId: latest?.variantId || latest?.variantPackId || t('None yet', 'None yet'),
    activeWorldBookCount: Array.isArray(latest?.activeWorldBookIds)
      ? latest.activeWorldBookIds.length
      : 0,
  }
})

const simulationModuleLabel = (moduleKey = '') => {
  if (moduleKey === 'food_delivery') return t('Food Delivery', 'Food Delivery')
  if (moduleKey === 'shopping') return t('Shopping', 'Shopping')
  if (moduleKey === 'logistics') return t('Logistics', 'Logistics')
  if (moduleKey === 'map') return t('Map', 'Map')
  if (moduleKey === 'chat') return t('Chat', 'Chat')
  if (moduleKey === 'simulation') return t('Simulation', 'Simulation')
  return moduleKey || t('Unknown module', 'Unknown module')
}

const simulationTriggerSourceLabel = (source = '') => {
  if (source === 'manual') return t('Manual', 'Manual')
  if (source === 'condition') return t('Condition', 'Condition')
  if (source === 'random') return t('Random', 'Random')
  if (source === 'scheduled') return t('Scheduled / session tick', 'Scheduled / session tick')
  if (source === 'ai_assisted') return t('AI assisted', 'AI assisted')
  if (source === 'system') return t('System', 'System')
  return source || t('Unknown source', 'Unknown source')
}

const simulationEventStatusLabel = (status = '') => {
  if (status === SIMULATION_EVENT_STATUS.TRIGGERED) return t('Triggered', 'Triggered')
  if (status === SIMULATION_EVENT_STATUS.SKIPPED) return t('Skipped', 'Skipped')
  if (status === SIMULATION_EVENT_STATUS.FAILED) return t('Failed', 'Failed')
  return status || t('Unknown', 'Unknown')
}

const simulationEventStatusClass = (status = '') => {
  if (status === SIMULATION_EVENT_STATUS.TRIGGERED) return 'bg-emerald-300/15 text-emerald-100'
  if (status === SIMULATION_EVENT_STATUS.FAILED) return 'bg-rose-300/15 text-rose-100'
  return 'bg-amber-300/15 text-amber-100'
}

const simulationEventReasonLabel = (reason = '') => {
  if (reason === 'eligible_random_passed') return t('Random gate passed and event executed', 'Random gate passed and event executed')
  if (reason === 'eligible_non_random') return t('Eligible non-random event executed', 'Eligible non-random event executed')
  if (reason === 'random_failed') return t('Random gate did not pass', 'Random gate did not pass')
  if (reason === 'cooldown_active') return t('Event is still cooling down', 'Event is still cooling down')
  if (reason === 'tick_cooldown_active') return t('Session tick is cooling down', 'Session tick is cooling down')
  if (reason === 'daily_limit_reached') return t('Daily limit reached', 'Daily limit reached')
  if (reason === 'surprise_mode_off') return t('Surprise Mode is off', 'Surprise Mode is off')
  if (reason === 'module_events_disabled') return t('Module events are disabled', 'Module events are disabled')
  if (reason === 'adapter_missing') return t('Event adapter is missing', 'Event adapter is missing')
  if (reason === 'adapter_threw') return t('Event adapter threw an error', 'Event adapter threw an error')
  if (reason === 'adapter_returned_empty') return t('Adapter returned no result', 'Adapter returned no result')
  return reason || t('No reason recorded', 'No reason recorded')
}

const simulationEventLabel = (eventId = '') => {
  if (eventId === 'simulation.session_tick.v1') return t('Session event tick', 'Session event tick')
  if (eventId === 'food_delivery.random_order_pilot.v1')
    return t('Food Delivery random order pilot', 'Food Delivery random order pilot')
  if (eventId === 'food_delivery.eta_update.v1') return t('Food Delivery ETA update', 'Food Delivery ETA update')
  if (eventId === 'food_delivery.rider_delay.v1') return t('Food Delivery rider delay', 'Food Delivery rider delay')
  if (eventId === 'food_delivery.restaurant_cancelled.v1')
    return t('Food Delivery restaurant cancelled', 'Food Delivery restaurant cancelled')
  if (eventId === 'food_delivery.address_change.v1')
    return t('Food Delivery address change', 'Food Delivery address change')
  if (eventId === 'food_delivery.status_update.v1')
    return t('Food Delivery status update', 'Food Delivery status update')
  if (eventId === 'shopping.logistics.package_shipped.v1')
    return t('Shopping package shipped', 'Shopping package shipped')
  if (eventId === 'shopping.logistics.package_arrived.v1')
    return t('Shopping package arrived', 'Shopping package arrived')
  if (eventId === 'shopping.logistics.pickup_point_changed.v1')
    return t('Shopping pickup point changed', 'Shopping pickup point changed')
  if (eventId === 'shopping.logistics.international_delay.v1')
    return t('International logistics delay', 'International logistics delay')
  return eventId || t('Unknown event', 'Unknown event')
}

const simulationEventTargetLabel = (log = {}) => {
  const targetId = typeof log.targetId === 'string' ? log.targetId.trim() : ''
  if (!targetId) return t('Global / no specific target', 'Global / no specific target')
  if (targetId === 'global') return t('Global session', 'Global session')
  return targetId
}

const simulationEventVariantLabel = (log = {}) =>
  [log.worldContextId, log.variantId, log.variantPackId]
    .filter((item) => typeof item === 'string' && item.trim())
    .join(' / ')

const simulationEventReviewExplanation = (log = {}) => {
  if (log.status === SIMULATION_EVENT_STATUS.TRIGGERED) {
    if (log.triggerSource === 'random') {
      return t(
        'The event passed eligibility, cooldown, daily-cap, and random-gate checks before the module adapter ran.',
        'The event passed eligibility, cooldown, daily-cap, and random-gate checks before the module adapter ran.',
      )
    }
    return t(
      'The event was eligible and the module adapter ran. Domain data still belongs to the owning module.',
      'The event was eligible and the module adapter ran. Domain data still belongs to the owning module.',
    )
  }
  if (log.status === SIMULATION_EVENT_STATUS.SKIPPED) {
    return t(
      'The runtime recorded why this event did not run, so skipped behavior can be audited without mutating module data.',
      'The runtime recorded why this event did not run, so skipped behavior can be audited without mutating module data.',
    )
  }
  if (log.status === SIMULATION_EVENT_STATUS.FAILED) {
    return t(
      'The runtime caught a failed adapter path and preserved the record for review.',
      'The runtime caught a failed adapter path and preserved the record for review.',
    )
  }
  return t(
    'This row is a read-only event-log record from the shared simulation runtime.',
    'This row is a read-only event-log record from the shared simulation runtime.',
  )
}

const simulationEventSafetyNotes = (log = {}) => {
  const notes = [
    t(
      'World Hub is reviewing the log only; selecting this row does not trigger the event again.',
      'World Hub is reviewing the log only; selecting this row does not trigger the event again.',
    ),
    log.adapterKey
      ? t(
          `Adapter boundary: ${log.adapterKey}`,
          `Adapter boundary: ${log.adapterKey}`,
        )
      : t(
          'No adapter boundary was recorded for this log.',
          'No adapter boundary was recorded for this log.',
        ),
  ]
  if (log.variantId || log.variantPackId || log.worldContextId) {
    notes.push(
      t(
        'World-aware context is present, so the event can be reviewed against its active variant data.',
        'World-aware context is present, so the event can be reviewed against its active variant data.',
      ),
    )
  }
  return notes
}

const chatSocialEventTypeLabel = (eventType = '') => {
  if (eventType === CHAT_SOCIAL_EVENT_TYPES.ROLE_GREETING_REQUEST) return t('Role greeting request', 'Role greeting request')
  if (eventType === CHAT_SOCIAL_EVENT_TYPES.ROLE_REFUSE_MESSAGES) return t('Role refuses messages', 'Role refuses messages')
  if (eventType === CHAT_SOCIAL_EVENT_TYPES.ROLE_RESTORE_MESSAGES) return t('Role restores messages', 'Role restores messages')
  if (eventType === CHAT_SOCIAL_EVENT_TYPES.ROLE_BLOCK_USER) return t('Role blocks user', 'Role blocks user')
  if (eventType === CHAT_SOCIAL_EVENT_TYPES.ROLE_UNBLOCK_USER) return t('Role unblocks user', 'Role unblocks user')
  return eventType || t('Chat social event', 'Chat social event')
}

const chatSocialEventStatusLabel = (status = '') => {
  if (status === CHAT_SOCIAL_EVENT_STATUS.APPLIED) return t('Applied', 'Applied')
  if (status === CHAT_SOCIAL_EVENT_STATUS.PENDING_REVIEW) return t('Pending review', 'Pending review')
  if (status === CHAT_SOCIAL_EVENT_STATUS.BLOCKED) return t('Blocked', 'Blocked')
  if (status === CHAT_SOCIAL_EVENT_STATUS.DISMISSED) return t('Dismissed', 'Dismissed')
  if (status === CHAT_SOCIAL_EVENT_STATUS.FAILED) return t('Failed', 'Failed')
  if (status === CHAT_SOCIAL_EVENT_STATUS.READY_TO_APPLY) return t('Ready to apply', 'Ready to apply')
  return status || t('Unknown', 'Unknown')
}

const chatSocialEventStatusClass = (status = '') => {
  if (status === CHAT_SOCIAL_EVENT_STATUS.APPLIED) return 'bg-emerald-300/15 text-emerald-100'
  if (status === CHAT_SOCIAL_EVENT_STATUS.PENDING_REVIEW) return 'bg-amber-300/15 text-amber-100'
  if (
    status === CHAT_SOCIAL_EVENT_STATUS.FAILED ||
    status === CHAT_SOCIAL_EVENT_STATUS.BLOCKED
  ) {
    return 'bg-rose-300/15 text-rose-100'
  }
  return 'bg-white/10 text-slate-300'
}

const relationshipEventStatusLabel = (status = '') => {
  if (status === RELATIONSHIP_EVENT_STATUS.APPLIED) return t('Applied', 'Applied')
  if (status === RELATIONSHIP_EVENT_STATUS.PENDING_CONFIRMATION) return t('Pending', 'Pending')
  if (status === RELATIONSHIP_EVENT_STATUS.DISMISSED) return t('Dismissed', 'Dismissed')
  if (status === RELATIONSHIP_EVENT_STATUS.SKIPPED_DISABLED) return t('Skipped', 'Skipped')
  return status || t('Unknown', 'Unknown')
}

const relationshipEventStatusClass = (status = '') => {
  if (status === RELATIONSHIP_EVENT_STATUS.APPLIED) return 'bg-emerald-300/15 text-emerald-100'
  if (status === RELATIONSHIP_EVENT_STATUS.PENDING_CONFIRMATION) return 'bg-amber-300/15 text-amber-100'
  if (status === RELATIONSHIP_EVENT_STATUS.DISMISSED) return 'bg-slate-300/15 text-slate-200'
  return 'bg-white/10 text-slate-400'
}

const relationshipEventReviewExplanation = (event = {}) => {
  if (event.status === RELATIONSHIP_EVENT_STATUS.PENDING_CONFIRMATION) {
    return t(
      'This relationship fact is waiting for explicit World Hub review before it can change relationship metrics.',
      'This relationship fact is waiting for explicit World Hub review before it can change relationship metrics.',
    )
  }
  if (event.status === RELATIONSHIP_EVENT_STATUS.APPLIED && event.effectApplied === false) {
    return t(
      'This fact is attached as supporting context for the same memory and does not apply another relationship metric change.',
      'This fact is attached as supporting context for the same memory and does not apply another relationship metric change.',
    )
  }
  if (event.status === RELATIONSHIP_EVENT_STATUS.APPLIED) {
    return t(
      'This fact has been applied by the relationship runtime. Source records remain owned by their original module.',
      'This fact has been applied by the relationship runtime. Source records remain owned by their original module.',
    )
  }
  if (event.status === RELATIONSHIP_EVENT_STATUS.DISMISSED) {
    return t(
      'This fact was dismissed and is retained for review history without applying metrics.',
      'This fact was dismissed and is retained for review history without applying metrics.',
    )
  }
  if (event.status === RELATIONSHIP_EVENT_STATUS.SKIPPED_DISABLED) {
    return t(
      'Relationship runtime was disabled when this fact arrived, so no relationship effect was applied.',
      'Relationship runtime was disabled when this fact arrived, so no relationship effect was applied.',
    )
  }
  return t(
    'This row is a relationship fact submitted through the shared relationship runtime.',
    'This row is a relationship fact submitted through the shared relationship runtime.',
  )
}

const formatMetricDeltas = (metricDeltas = {}) => {
  const entries = Object.entries(metricDeltas || {})
    .filter(([, value]) => Number(value) !== 0)
    .map(([key, value]) => `${key} ${Number(value) > 0 ? '+' : ''}${Number(value)}`)
  return entries.length > 0 ? entries.join(' / ') : t('No metric change', 'No metric change')
}

const relationshipEventSafetyNotes = (event = {}) => [
  event.memoryKey
    ? t(
        `Memory group: ${event.memoryKey}`,
        `Memory group: ${event.memoryKey}`,
      )
    : t('No memory group attached.', 'No memory group attached.'),
  event.status === RELATIONSHIP_EVENT_STATUS.PENDING_CONFIRMATION
    ? t(
        'Pending review: no metric change is applied until this is approved.',
        'Pending review: no metric change is applied until this is approved.',
      )
    : event.effectApplied === false
      ? t(
          'Supporting-only: no duplicate relationship growth.',
          'Supporting-only: no duplicate relationship growth.',
        )
      : t(
          'Metric effect follows the relationship runtime status shown here.',
          'Metric effect follows the relationship runtime status shown here.',
        ),
  event.relationshipGate?.mode
    ? t(
        `Classification gate: ${event.relationshipGate.mode} / ${event.relationshipGate.primaryRelationshipCategoryId || 'ordinary_acquaintance'} / ${event.relationshipGate.reason || 'matched'}`,
        `Classification gate: ${event.relationshipGate.mode} / ${event.relationshipGate.primaryRelationshipCategoryId || 'ordinary_acquaintance'} / ${event.relationshipGate.reason || 'matched'}`,
      )
    : t(
        'No relationship classification gate was recorded for this fact.',
        'No relationship classification gate was recorded for this fact.',
      ),
  t(
    'Source cleanup remains delegated to the owning module handlers.',
    'Source cleanup remains delegated to the owning module handlers.',
  ),
]

const relationshipMemoryReviewLabel = (status = '') => {
  if (status === RELATIONSHIP_MEMORY_REVIEW_STATES.PINNED) return t('置顶', 'Pinned')
  if (status === RELATIONSHIP_MEMORY_REVIEW_STATES.ARCHIVED) return t('归档', 'Archived')
  return t('活跃', 'Active')
}

const relationshipMemoryReviewClass = (status = '') => {
  if (status === RELATIONSHIP_MEMORY_REVIEW_STATES.PINNED) return 'bg-cyan-300/15 text-cyan-100'
  if (status === RELATIONSHIP_MEMORY_REVIEW_STATES.ARCHIVED) return 'bg-white/10 text-slate-400'
  return 'bg-emerald-300/15 text-emerald-100'
}

const relationshipSourceLabel = (sourceModule = '') => {
  if (sourceModule === 'relationship_shopping_gift') return t('Shopping gift', 'Shopping gift')
  if (sourceModule === 'relationship_food_delivery_shared_meal')
    return t('Food Delivery shared meal', 'Food Delivery shared meal')
  if (sourceModule === 'relationship_phone_call') return t('Phone call', 'Phone call')
  if (sourceModule === 'relationship_map_shared_route') return t('Map shared route', 'Map shared route')
  if (sourceModule === 'relationship_wallet_shared_transfer')
    return t('Wallet shared transfer', 'Wallet shared transfer')
  if (sourceModule === 'relationship_calendar_confirmed_event')
    return t('Calendar confirmed event', 'Calendar confirmed event')
  if (sourceModule === 'relationship_runtime') return t('Relationship runtime', 'Relationship runtime')
  return sourceModule || t('Unknown source', 'Unknown source')
}

const relationshipFactTypeLabel = (factType = '') => {
  if (factType === 'gift_purchased') return t('Gift purchased', 'Gift purchased')
  if (factType === 'shared_meal') return t('Shared meal', 'Shared meal')
  if (factType === 'completed_call') return t('Completed call', 'Completed call')
  if (factType === 'missed_call') return t('Missed call', 'Missed call')
  if (factType === 'shared_route') return t('Shared route', 'Shared route')
  if (factType === 'shared_expense') return t('Shared expense', 'Shared expense')
  if (factType === 'transfer_recorded') return t('Transfer recorded', 'Transfer recorded')
  if (factType === 'scheduled_calendar_event') return t('Scheduled calendar event', 'Scheduled calendar event')
  return factType || t('Relationship fact', 'Relationship fact')
}

const relationshipStageLabel = (stage = '') => {
  if (stage === 'stranger') return t('Stranger', 'Stranger')
  if (stage === 'acquaintance') return t('Acquaintance', 'Acquaintance')
  if (stage === 'friend') return t('Friend', 'Friend')
  if (stage === 'close') return t('Close', 'Close')
  if (stage === 'intimate') return t('Intimate', 'Intimate')
  if (stage === 'distant') return t('Distant', 'Distant')
  if (stage === 'conflict') return t('Conflict', 'Conflict')
  return stage || t('Unknown', 'Unknown')
}

const relationshipMemoryReviewSummaryText = (memory = {}) => {
  const base =
    memory?.displaySummary ||
    memory?.primarySummary ||
    memory?.latestSummary ||
    memory?.reviewSummary ||
    memory?.recallSummary ||
    ''
  if (!base) return ''
  const relatedRecordCount = Number(memory?.supportingCount) || 0
  if (relatedRecordCount <= 1) return base
  return t(
    `${base}（包含 ${relatedRecordCount} 条关联记录）`,
    `${base} (${relatedRecordCount} related records)`,
  )
}

const relationshipRuntimeStats = computed(() => [
  {
    id: 'entities',
    label: t('Relationship entities', 'Relationship entities'),
    value: String(relationshipEntityCount.value),
    hint: t('Roles or contacts with relationship runtime snapshots.', 'Roles or contacts with relationship runtime snapshots.'),
  },
  {
    id: 'events',
    label: t('Relationship events', 'Relationship events'),
    value: String(relationshipRuntimeStore.events.length),
    hint: t('Relationship facts submitted by modules.', 'Relationship facts submitted by modules.'),
  },
  {
    id: 'pending',
    label: t('Pending effects', 'Pending effects'),
    value: String(pendingRelationshipEventCount.value),
    hint: t('Major relationship changes should later be reviewed in World Hub.', 'Major relationship changes should later be reviewed in World Hub.'),
  },
  {
    id: 'enabled',
    label: t('Runtime switch', 'Runtime switch'),
    value: relationshipRuntimeStore.settings.enabled ? t('On', 'On') : t('Off', 'Off'),
    hint: t('When off, regular Chat, Map, and Shopping flows still work.', 'When off, regular Chat, Map, and Shopping flows still work.'),
  },
])

const formatRuntimeTime = (timestamp) => {
  const ts = Number(timestamp)
  if (!Number.isFinite(ts) || ts <= 0) return t('No records yet', 'No records yet')
  const locale = (settings.value.system?.language || '').toLowerCase().startsWith('zh')
    ? 'zh-CN'
    : settings.value.system?.language || 'en-US'
  try {
    return new Date(ts).toLocaleString(locale)
  } catch {
    return new Date(ts).toLocaleString()
  }
}

const toRuntimeProfileId = (value) => {
  const num = Number(value)
  return Number.isFinite(num) && num > 0 ? Math.floor(num) : 0
}

const summarizeRuntimeSourceRefs = (sourceRefs = []) =>
  (Array.isArray(sourceRefs) ? sourceRefs : []).reduce((acc, ref) => {
    const moduleKey = ref?.sourceModule || ''
    if (!moduleKey) return acc
    acc[moduleKey] = (acc[moduleKey] || 0) + 1
    return acc
  }, {})

const resolveRuntimeRoleProfile = (entity = {}) => {
  if (entity?.roleProfile?.id) return entity.roleProfile
  const profileId = toRuntimeProfileId(entity?.profileId)
  return profileId > 0 ? chatStore.getRoleProfileById(profileId) : null
}

const buildRuntimeCleanupProfile = (entity = {}, roleProfile = resolveRuntimeRoleProfile(entity)) => {
  if (roleProfile) return roleProfile
  const profileId = toRuntimeProfileId(entity?.profileId)
  return {
    id: profileId,
    profileId,
    name: entity?.displayName || '',
  }
}

const runtimeEntityIdentifierLine = (entity = {}, roleProfile = resolveRuntimeRoleProfile(entity)) =>
  roleProfile?.roleId
    ? `${t('Role ID', 'Role ID')}: ${roleProfile.roleId}`
    : `${t('Runtime key', 'Runtime key')}: ${entity?.entityKey || '-'}`

const buildRuntimeOnlyImpact = (entity = {}, sourceRefs = []) => ({
  memoryGroupCount: relationshipRuntimeStore.listMemoryGroupsForTarget(entity, 50).length,
  sourceModuleCounts: summarizeRuntimeSourceRefs(sourceRefs),
})

const relationshipRuntimeEntityRows = computed(() =>
  relationshipRuntimeStore.entities.slice(0, 4).map((entity) => {
    const snapshot = relationshipRuntimeStore.summarizeEntityForTarget(entity, {
      eventLimit: 3,
      memoryLimit: 2,
    })
    const roleProfile = resolveRuntimeRoleProfile(entity)
    const sourceRefs = relationshipRuntimeStore.listSourceRefsForTarget(entity)
    const allMemorySummaries = relationshipRuntimeStore.listMemoryAggregatesForTarget(entity, 2)
    const memorySummaries = snapshot?.memorySummaries || []
    const primaryMemory = snapshot?.primaryMemory || null
    const managementMemory = primaryMemory || allMemorySummaries[0] || null
    const archiveOnlyHint =
      snapshot?.hasArchivedOnlyMemories === true
        ? t(
            'Only archived memories remain, so the default summary is hidden.',
            'Only archived memories remain, so the default summary is hidden.',
          )
        : ''
    const displayMemory = primaryMemory || (archiveOnlyHint ? managementMemory : null)
    const impact = roleProfile
      ? buildRoleDeleteImpact({
          chatStore,
          relationshipRuntimeStore,
          profile: roleProfile,
        })
      : buildRuntimeOnlyImpact(entity, sourceRefs)
    const hasMissingProfile = !roleProfile && toRuntimeProfileId(entity.profileId) > 0
    return {
      ...entity,
      stageLabel: relationshipStageLabel(entity.relationshipStage),
      updatedAtLabel: formatRuntimeTime(entity.updatedAt),
      memorySummaries,
      primaryMemorySummaryText:
        relationshipMemoryReviewSummaryText(primaryMemory) ||
        primaryMemory?.recallSummary ||
        primaryMemory?.displaySummary ||
        primaryMemory?.primarySummary ||
        primaryMemory?.latestSummary ||
        '',
      archiveOnlyHint,
      primaryMemoryStatusLabel: displayMemory ? relationshipMemoryReviewLabel(displayMemory.reviewStatus) : '',
      primaryMemoryStatusClass: displayMemory ? relationshipMemoryReviewClass(displayMemory.reviewStatus) : '',
      primaryMemoryReviewNote: displayMemory?.reviewNote || '',
      managementMemory,
      sourceRefs,
      impact,
      roleProfile,
      identifierLabel: runtimeEntityIdentifierLine(entity, roleProfile),
      profileStatusLabel: roleProfile
        ? `${t('Contacts profile', 'Contacts profile')}: ${roleProfile.name}`
        : hasMissingProfile
          ? t(
              'Contacts profile is missing; only runtime context can be cleared here.',
              'Contacts profile is missing; only runtime context can be cleared here.',
            )
          : t('Runtime-only relationship target', 'Runtime-only relationship target'),
      canManage: toRuntimeProfileId(entity.profileId) > 0 || Boolean(entity.entityKey),
    }
  }),
)

const eventLogModuleOptions = computed(() => [
  { value: 'all', label: t('All modules', 'All modules') },
  ...[...new Set(recentEventLogs.value.map((log) => log.moduleKey).filter(Boolean))]
    .sort()
    .map((moduleKey) => ({
      value: moduleKey,
      label: simulationModuleLabel(moduleKey),
    })),
])

const eventLogStatusOptions = computed(() => [
  { value: 'all', label: t('All statuses', 'All statuses') },
  { value: SIMULATION_EVENT_STATUS.TRIGGERED, label: simulationEventStatusLabel(SIMULATION_EVENT_STATUS.TRIGGERED) },
  { value: SIMULATION_EVENT_STATUS.SKIPPED, label: simulationEventStatusLabel(SIMULATION_EVENT_STATUS.SKIPPED) },
  { value: SIMULATION_EVENT_STATUS.FAILED, label: simulationEventStatusLabel(SIMULATION_EVENT_STATUS.FAILED) },
])

const relationshipEventStatusOptions = computed(() => [
  { value: 'all', label: t('All statuses', 'All statuses') },
  { value: RELATIONSHIP_EVENT_STATUS.PENDING_CONFIRMATION, label: relationshipEventStatusLabel(RELATIONSHIP_EVENT_STATUS.PENDING_CONFIRMATION) },
  { value: RELATIONSHIP_EVENT_STATUS.APPLIED, label: relationshipEventStatusLabel(RELATIONSHIP_EVENT_STATUS.APPLIED) },
  { value: RELATIONSHIP_EVENT_STATUS.DISMISSED, label: relationshipEventStatusLabel(RELATIONSHIP_EVENT_STATUS.DISMISSED) },
  { value: RELATIONSHIP_EVENT_STATUS.SKIPPED_DISABLED, label: relationshipEventStatusLabel(RELATIONSHIP_EVENT_STATUS.SKIPPED_DISABLED) },
])

const relationshipEventSourceOptions = computed(() => [
  { value: 'all', label: t('All sources', 'All sources') },
  ...[...new Set(relationshipRuntimeStore.events.map((event) => event.sourceModule).filter(Boolean))]
    .sort()
    .map((sourceModule) => ({
      value: sourceModule,
      label: relationshipSourceLabel(sourceModule),
    })),
])

const chatSocialEventRows = computed(() =>
  simulationStore.chatSocialEventProposals.slice(0, 8).map((proposal) => {
    const contact = chatStore.getContactById(proposal.targetContactId)
    const profile = proposal.targetProfileId
      ? chatStore.getRoleProfileById(proposal.targetProfileId)
      : null
    return {
      ...proposal,
      targetLabel:
        profile?.name ||
        contact?.name ||
        proposal.targetName ||
        t('Unknown role', 'Unknown role'),
      typeLabel: chatSocialEventTypeLabel(proposal.eventType),
      statusLabel: chatSocialEventStatusLabel(proposal.status),
      statusClass: chatSocialEventStatusClass(proposal.status),
      triggerSourceLabel: simulationTriggerSourceLabel(proposal.triggerSource),
      canReview: proposal.status === CHAT_SOCIAL_EVENT_STATUS.PENDING_REVIEW,
      createdAtLabel: formatRuntimeTime(proposal.createdAt),
    }
  }),
)

const relationshipSourceCleanupHandlers = computed(() =>
  createRelationshipSourceCleanupHandlers({
    phoneStore,
    shoppingStore,
    foodDeliveryStore,
    walletStore,
    calendarStore,
    mapStore,
    t,
  }),
)

const relationshipRuntimeEventRows = computed(() =>
  relationshipRuntimeStore.events
    .filter((event) =>
      relationshipEventStatusFilter.value === 'all'
        ? true
        : event.status === relationshipEventStatusFilter.value,
    )
    .filter((event) =>
      relationshipEventSourceFilter.value === 'all'
        ? true
        : event.sourceModule === relationshipEventSourceFilter.value,
    )
    .slice(0, 12)
    .map((event) => ({
      ...event,
      sourceLabel: relationshipSourceLabel(event.sourceModule),
      factTypeLabel: relationshipFactTypeLabel(event.factType),
      statusLabel: relationshipEventStatusLabel(event.status),
      statusClass: relationshipEventStatusClass(event.status),
      canReview: event.status === RELATIONSHIP_EVENT_STATUS.PENDING_CONFIRMATION,
      createdAtLabel: formatRuntimeTime(event.createdAt),
      explanation: relationshipEventReviewExplanation(event),
      metricDeltaText: formatMetricDeltas(event.metricDeltas),
      safetyNotes: relationshipEventSafetyNotes(event),
    })),
)

const recentRuntimeLogs = computed(() =>
  recentEventLogs.value
    .filter((log) =>
      eventLogModuleFilter.value === 'all'
        ? true
        : log.moduleKey === eventLogModuleFilter.value,
    )
    .filter((log) =>
      eventLogStatusFilter.value === 'all'
        ? true
        : log.status === eventLogStatusFilter.value,
    )
    .slice(0, 12)
    .map((log) => ({
      ...log,
      eventLabel: simulationEventLabel(log.eventId),
      moduleLabel: simulationModuleLabel(log.moduleKey),
      triggerSourceLabel: simulationTriggerSourceLabel(log.triggerSource),
      statusLabel: simulationEventStatusLabel(log.status),
      statusClass: simulationEventStatusClass(log.status),
      reasonLabel: simulationEventReasonLabel(log.reason),
      targetLabel: simulationEventTargetLabel(log),
      variantLabel: simulationEventVariantLabel(log),
      createdAtLabel: formatRuntimeTime(log.at),
      explanation: simulationEventReviewExplanation(log),
      safetyNotes: simulationEventSafetyNotes(log),
    })),
)

const selectedRuntimeLog = computed(
  () => recentRuntimeLogs.value.find((log) => log.id === selectedEventLogId.value) || recentRuntimeLogs.value[0] || null,
)

const selectedRelationshipEvent = computed(
  () =>
    relationshipRuntimeEventRows.value.find((event) => event.id === selectedRelationshipEventId.value) ||
    relationshipRuntimeEventRows.value[0] ||
    null,
)

const selectedChatSocialEvent = computed(
  () =>
    chatSocialEventRows.value.find((event) => event.id === selectedChatSocialEventId.value) ||
    chatSocialEventRows.value[0] ||
    null,
)

watch(recentRuntimeLogs, (logs) => {
  if (!logs.some((log) => log.id === selectedEventLogId.value)) {
    selectedEventLogId.value = logs[0]?.id || ''
  }
}, { immediate: true })

watch(relationshipRuntimeEventRows, (events) => {
  if (!events.some((event) => event.id === selectedRelationshipEventId.value)) {
    selectedRelationshipEventId.value = events[0]?.id || ''
  }
}, { immediate: true })

watch(chatSocialEventRows, (events) => {
  if (!events.some((event) => event.id === selectedChatSocialEventId.value)) {
    selectedChatSocialEventId.value = events[0]?.id || ''
  }
}, { immediate: true })

const goHome = () => {
  pushReturnTarget(router, route, '/home')
}

const openAppStore = () => {
  router.push('/app-store')
}

const applyRelationshipEvent = (eventId) => {
  relationshipRuntimeStore.applyPendingRelationshipEvent(eventId)
}

const dismissRelationshipEvent = (eventId) => {
  relationshipRuntimeStore.dismissRelationshipEvent(eventId)
}

const approveChatSocialEvent = (proposalId) => {
  simulationStore.approveChatSocialEventProposal(proposalId, { chatStore, at: Date.now() })
}

const dismissChatSocialEvent = (proposalId) => {
  simulationStore.dismissChatSocialEventProposal(proposalId, { at: Date.now() })
}

const resetRuntimeEntityFromWorldHub = async (entity) => {
  if (!entity?.entityKey) return
  const roleProfile = resolveRuntimeRoleProfile(entity)
  const cleanupProfile = buildRuntimeCleanupProfile(entity, roleProfile)
  const sourceRefs = relationshipRuntimeStore.listSourceRefsForTarget(entity)
  const impact = roleProfile
    ? buildRoleDeleteImpact({ chatStore, relationshipRuntimeStore, profile: roleProfile })
    : buildRuntimeOnlyImpact(entity, sourceRefs)
  const firstOk = await confirmDialog({
    title: t('重置关系上下文', 'Reset relationship context'),
    message: t(
      'World Hub 会清除该对象的关系运行时、记忆组、事件挂载详情、聊天记录，并对已关联来源记录做解绑或匿名改写。',
      'World Hub will clear this relationship runtime, memories, event-attached details, chat history, and unlink or anonymize linked source records.',
    ),
    details: [
      `${t('对象', 'Target')}: ${entity.displayName || entity.entityKey}`,
      runtimeEntityIdentifierLine(entity, roleProfile),
      `${t('记忆组', 'Memory groups')}: ${impact.memoryGroupCount || 0}`,
      `${t('来源', 'Sources')}: ${sourceModuleSummaryText(impact.sourceModuleCounts, t)}`,
      cleanupCoverageText(impact.sourceModuleCounts, relationshipSourceCleanupHandlers.value, t),
    ],
    confirmText: t('继续', 'Continue'),
    cancelText: t('取消', 'Cancel'),
    tone: 'danger',
  })
  if (!firstOk) return
  const expected = entity.entityKey
  const typed = await promptDialog({
    title: t('确认重置关系上下文', 'Confirm relationship reset'),
    message: t(
      '请输入该关系对象键，避免误清理 World Hub 中的关系上下文。',
      'Type the relationship entity key to avoid clearing the wrong World Hub context.',
    ),
    inputLabel: t('关系对象键', 'Relationship entity key'),
    inputPlaceholder: expected,
    inputRequired: true,
    confirmText: t('确认重置', 'Confirm reset'),
    cancelText: t('取消', 'Cancel'),
    tone: 'danger',
    validate: (value) =>
      value === expected
        ? ''
        : t('输入的对象键不一致。', 'Entity key does not match.'),
  })
  if (typed === null) return
  const result = roleProfile
    ? resetRoleRelationshipState({
        chatStore,
        relationshipRuntimeStore,
        profile: roleProfile,
        cleanupHandlers: relationshipSourceCleanupHandlers.value,
      })
    : (() => {
        const runtimeResult = relationshipRuntimeStore.resetRelationshipForTarget(entity)
        const cleanupResult = cleanupRelationshipSourceRecords(
          runtimeResult?.sourceRefs || sourceRefs,
          relationshipSourceCleanupHandlers.value,
          {
            cleanupMode: RELATIONSHIP_CLEANUP_MODES.RESET_RELATIONSHIP,
            profile: cleanupProfile,
          },
        )
        return {
          ok: Boolean(runtimeResult?.ok || cleanupResult.requestedCount),
          runtimeResult,
          cleanupResult,
        }
      })()
  const summary = cleanupResultSummaryText(result.cleanupResult, t)
  await confirmDialog({
    title: result.ok ? t('关系上下文已重置', 'Relationship context reset') : t('没有可重置的关系上下文', 'No relationship context to reset'),
    message: summary || t('World Hub 已完成该操作。', 'World Hub completed the operation.'),
    confirmText: t('知道了', 'Done'),
    cancelText: '',
    dismissible: true,
  })
}

const deleteRuntimeMemoryFromWorldHub = async (entity, memory) => {
  if (!entity?.entityKey || !memory?.memoryKey) return
  const roleProfile = resolveRuntimeRoleProfile(entity)
  const cleanupProfile = buildRuntimeCleanupProfile(entity, roleProfile)
  const detail = relationshipRuntimeStore.getMemoryGroupDetail(entity, memory.memoryKey)
  const firstOk = await confirmDialog({
    title: t('删除关系记忆组', 'Delete relationship memory'),
    message: detail?.displaySummary || memory.displaySummary || memory.primarySummary || memory.memoryKey,
    details: [
      `${t('对象', 'Target')}: ${entity.displayName || entity.entityKey}`,
      runtimeEntityIdentifierLine(entity, roleProfile),
      `${t('记忆键', 'Memory key')}: ${memory.memoryKey}`,
      `${t('包含关系事件', 'Relationship events')}: ${detail?.events?.length || memory.supportingCount || 0}`,
      cleanupCoverageText(detail?.sourceModuleCounts, relationshipSourceCleanupHandlers.value, t),
    ],
    confirmText: t('继续', 'Continue'),
    cancelText: t('取消', 'Cancel'),
    tone: 'danger',
  })
  if (!firstOk) return
  const result = roleProfile
    ? deleteRoleMemoryGroup({
        chatStore,
        relationshipRuntimeStore,
        profile: roleProfile,
        memoryKey: memory.memoryKey,
        cleanupHandlers: relationshipSourceCleanupHandlers.value,
      })
    : (() => {
        const runtimeResult = relationshipRuntimeStore.removeMemoryGroupForTarget(
          entity,
          memory.memoryKey,
        )
        const cleanupResult = cleanupRelationshipSourceRecords(
          runtimeResult?.sourceRefs || detail?.sourceRefs || [],
          relationshipSourceCleanupHandlers.value,
          {
            cleanupMode: RELATIONSHIP_CLEANUP_MODES.DELETE_MEMORY_GROUP,
            profile: cleanupProfile,
            memoryKey: memory.memoryKey,
          },
        )
        return {
          ok: Boolean(runtimeResult?.ok || cleanupResult.requestedCount),
          runtimeResult,
          cleanupResult,
          clearedDetailItems: 0,
        }
      })()
  const summary = cleanupResultSummaryText(result.cleanupResult, t)
  await confirmDialog({
    title: result.ok ? t('关系记忆组已删除', 'Relationship memory deleted') : t('未找到关系记忆组', 'Relationship memory not found'),
    message: summary || t('World Hub 已完成该操作。', 'World Hub completed the operation.'),
    confirmText: t('知道了', 'Done'),
    cancelText: '',
    dismissible: true,
  })
}
</script>

<template>
  <div class="flex h-full w-full flex-col bg-slate-950 text-white">
    <header class="flex items-center gap-3 border-b border-white/10 px-4 pb-4 pt-12">
      <button class="flex items-center gap-1 text-sm text-slate-300" type="button" @click="goHome">
        <i class="fas fa-chevron-left"></i>
        {{ t('Home', 'Home') }}
      </button>
      <div>
        <p class="text-[11px] uppercase tracking-[0.22em] text-cyan-200">
          {{ t('Optional Play Layer', 'Optional Play Layer') }}
        </p>
        <h1 class="text-lg font-bold">{{ t('世界中枢', 'World Hub') }}</h1>
      </div>
    </header>

    <main class="no-scrollbar flex-1 space-y-4 overflow-y-auto p-4">
      <section
        class="rounded-3xl border border-cyan-300/20 bg-cyan-300/10 p-4 shadow-2xl shadow-cyan-950/30"
        data-testid="control-center-status"
      >
        <div class="flex items-start justify-between gap-3">
          <div>
            <p class="text-sm font-semibold">
              {{ homeEntryVisible ? t('主屏入口已显示', 'Home Entry Visible') : t('主屏入口已隐藏', 'Hidden from Home') }}
            </p>
            <p class="mt-2 text-xs leading-5 text-slate-300">
              {{
                homeEntryVisible
                  ? t(
                    '这个入口已放在主屏；当前页面用于查看事件、关系记忆和世界状态。',
                    'This entry is on Home. This page reviews events, relationship memory, and world state.',
                  )
                  : t(
                    '世界中枢仍可访问；如需放到主屏，请在应用商城中加入入口。',
                    'World Hub remains available. Add it to Home from App Store if needed.',
                  )
              }}
            </p>
          </div>
          <span
            class="rounded-full px-3 py-1 text-[11px] font-semibold"
            :class="homeEntryVisible ? 'bg-cyan-300 text-slate-950' : 'bg-white/10 text-slate-300'"
          >
            {{ homeEntryVisible ? t('主屏', 'Home') : t('库内', 'Library') }}
          </span>
        </div>
        <button
          v-if="!homeEntryVisible"
          class="mt-4 rounded-full bg-white px-4 py-2 text-xs font-semibold text-slate-950"
          type="button"
          @click="openAppStore"
        >
          {{ t('在应用商城管理', 'Manage in App Store') }}
        </button>
      </section>

      <section
        class="rounded-3xl border border-white/10 bg-slate-900/85 p-4"
        data-testid="control-center-runtime-panel"
      >
        <div class="flex items-start justify-between gap-3">
          <div>
            <p class="text-[11px] uppercase tracking-[0.18em] text-cyan-200">
              {{ t('Runtime Readout', 'Runtime Readout') }}
            </p>
            <h2 class="mt-1 text-base font-semibold">
              {{ t('Simulation engine read-only status', 'Simulation engine read-only status') }}
            </h2>
          </div>
          <span class="rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold text-slate-200">
            {{ t('Read-only', 'Read-only') }}
          </span>
        </div>
        <p class="mt-2 text-xs leading-5 text-slate-400">
          {{ t('This panel only reads simulationStore. It does not trigger events or mutate module data.', 'This panel only reads simulationStore. It does not trigger events or mutate module data.') }}
        </p>
        <div class="mt-4 grid grid-cols-2 gap-2">
          <article
            v-for="stat in runtimeStats"
            :key="stat.id"
            class="rounded-2xl border border-white/10 bg-white/8 p-3"
            :data-testid="`control-center-stat-${stat.id}`"
          >
            <p class="text-[11px] text-slate-400">{{ stat.label }}</p>
            <p class="mt-1 text-lg font-bold text-white">{{ stat.value }}</p>
            <p class="mt-1 text-[11px] leading-4 text-slate-500">{{ stat.hint }}</p>
          </article>
        </div>
        <div class="mt-3 grid grid-cols-3 gap-2 text-center text-[11px]">
          <span class="rounded-xl bg-emerald-300/10 px-2 py-2 text-emerald-100">
            {{ t('Triggered', 'Triggered') }} {{ recentRuntimeStatusCounts.triggered }}
          </span>
          <span class="rounded-xl bg-amber-300/10 px-2 py-2 text-amber-100">
            {{ t('Skipped', 'Skipped') }} {{ recentRuntimeStatusCounts.skipped }}
          </span>
          <span class="rounded-xl bg-rose-300/10 px-2 py-2 text-rose-100">
            {{ t('Failed', 'Failed') }} {{ recentRuntimeStatusCounts.failed }}
          </span>
        </div>
      </section>

      <section
        class="rounded-3xl border border-amber-300/20 bg-amber-300/10 p-4"
        data-testid="control-center-chat-social-panel"
      >
        <div class="flex items-start justify-between gap-3">
          <div>
            <p class="text-[11px] uppercase tracking-[0.18em] text-amber-100">
              {{ t('Chat social events', 'Chat social events') }}
            </p>
            <h2 class="mt-1 text-base font-semibold">
              {{ t('Role-initiated communication review', 'Role-initiated communication review') }}
            </h2>
          </div>
          <span class="rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold text-slate-200">
            {{ t('Review first', 'Review first') }}
          </span>
        </div>
        <p class="mt-2 text-xs leading-5 text-slate-300">
          {{ t('AI may propose greetings or blocking changes, but World Hub reviews high-risk communication changes before Chat applies them.', 'AI may propose greetings or blocking changes, but World Hub reviews high-risk communication changes before Chat applies them.') }}
        </p>

        <div v-if="chatSocialEventRows.length" class="mt-3 space-y-2">
          <article
            v-for="event in chatSocialEventRows"
            :key="event.id"
            class="rounded-2xl border p-3"
            :class="selectedChatSocialEvent?.id === event.id ? 'border-amber-200/70 bg-amber-200/10' : 'border-white/10 bg-white/8'"
            data-testid="control-center-chat-social-event"
            @click="selectedChatSocialEventId = event.id"
          >
            <div class="flex items-start justify-between gap-3">
              <div>
                <p class="text-xs font-semibold text-white">{{ event.typeLabel }}</p>
                <p class="mt-1 text-[11px] text-slate-500">
                  {{ event.targetLabel }} / {{ event.triggerSourceLabel }} / {{ event.createdAtLabel }}
                </p>
              </div>
              <span
                class="shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold"
                :class="event.statusClass"
              >
                {{ event.statusLabel }}
              </span>
            </div>
            <p class="mt-2 text-[11px] leading-4 text-slate-400">
              {{ event.explanation || event.reason }}
            </p>
            <p class="mt-1 text-[10px] leading-4 text-slate-600">
              {{ t('State change', 'State change') }}:
              {{ event.currentChatSocialState || '-' }} -> {{ event.requestedChatSocialState || '-' }}
            </p>
            <div v-if="event.canReview" class="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                class="rounded-full bg-emerald-300 px-3 py-1.5 text-[11px] font-semibold text-slate-950"
                :data-testid="`control-center-chat-social-approve-${event.id}`"
                @click.stop="approveChatSocialEvent(event.id)"
              >
                {{ t('Apply to Chat', 'Apply to Chat') }}
              </button>
              <button
                type="button"
                class="rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-semibold text-slate-200"
                :data-testid="`control-center-chat-social-dismiss-${event.id}`"
                @click.stop="dismissChatSocialEvent(event.id)"
              >
                {{ t('Dismiss', 'Dismiss') }}
              </button>
            </div>
          </article>
        </div>
        <p v-else class="mt-3 rounded-2xl bg-white/8 px-3 py-3 text-xs leading-5 text-slate-400">
          {{ t('No generated Chat social events yet. User-authored Chat actions still stay inside Chat.', 'No generated Chat social events yet. User-authored Chat actions still stay inside Chat.') }}
        </p>

        <article
          v-if="selectedChatSocialEvent"
          class="mt-3 rounded-2xl border border-amber-200/20 bg-amber-200/8 p-3"
          data-testid="control-center-chat-social-detail"
        >
          <p class="text-xs font-semibold text-white">{{ t('Review detail', 'Review detail') }}</p>
          <div class="mt-3 grid gap-2 text-[11px]">
            <span class="rounded-xl bg-white/8 px-3 py-2">
              {{ t('Requested Chat state', 'Requested Chat state') }}:
              {{ selectedChatSocialEvent.requestedChatSocialState || '-' }}
            </span>
            <span class="rounded-xl bg-white/8 px-3 py-2">
              {{ t('Relationship gate', 'Relationship gate') }}:
              {{ selectedChatSocialEvent.relationshipGate?.mode || '-' }} /
              {{ selectedChatSocialEvent.relationshipGate?.primaryRelationshipCategoryId || '-' }}
            </span>
            <span class="rounded-xl bg-white/8 px-3 py-2">
              {{ t('Rule', 'Rule') }}:
              {{ t('Chat changes only after this proposal is applied.', 'Chat changes only after this proposal is applied.') }}
            </span>
          </div>
        </article>
      </section>

      <section
        class="rounded-3xl border border-rose-300/20 bg-rose-300/10 p-4"
        data-testid="control-center-relationship-panel"
      >
        <div class="flex items-start justify-between gap-3">
          <div>
            <p class="text-[11px] uppercase tracking-[0.18em] text-rose-100">
              {{ t('Relationship Runtime', 'Relationship Runtime') }}
            </p>
            <h2 class="mt-1 text-base font-semibold">
              {{ t('Affinity and relationship progress review', 'Affinity and relationship progress review') }}
            </h2>
          </div>
          <span class="rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold text-slate-200">
            {{ t('Review + cleanup', 'Review + cleanup') }}
          </span>
        </div>
        <p class="mt-2 text-xs leading-5 text-slate-300">
          {{ t('World Hub now reviews relationship runtime state and can clean relationship context without owning Contacts profiles or module records.', 'World Hub now reviews relationship runtime state and can clean relationship context without owning Contacts profiles or module records.') }}
        </p>
        <div class="mt-4 grid grid-cols-2 gap-2">
          <article
            v-for="stat in relationshipRuntimeStats"
            :key="stat.id"
            class="rounded-2xl border border-white/10 bg-white/8 p-3"
            :data-testid="`control-center-relationship-stat-${stat.id}`"
          >
            <p class="text-[11px] text-slate-400">{{ stat.label }}</p>
            <p class="mt-1 text-lg font-bold text-white">{{ stat.value }}</p>
            <p class="mt-1 text-[11px] leading-4 text-slate-500">{{ stat.hint }}</p>
          </article>
        </div>

        <div class="mt-4 rounded-2xl border border-white/10 bg-slate-950/35 p-3">
          <div class="flex items-center justify-between gap-3">
            <p class="text-xs font-semibold text-slate-100">
              {{ t('Relationship entity snapshots', 'Relationship entity snapshots') }}
            </p>
            <span class="text-[11px] text-slate-500">{{ t('Top 4', 'Top 4') }}</span>
          </div>
          <div v-if="relationshipRuntimeEntityRows.length" class="mt-3 space-y-2">
            <article
              v-for="entity in relationshipRuntimeEntityRows"
              :key="entity.entityKey"
              class="rounded-2xl bg-white/8 px-3 py-3"
              data-testid="control-center-relationship-entity"
            >
              <div class="flex items-start justify-between gap-3">
                <div>
                  <p class="text-xs font-semibold text-white">
                    {{ entity.displayName || entity.entityKey }}
                  </p>
                  <p class="mt-1 text-[11px] text-slate-500">
                    {{ entity.stageLabel }} / {{ entity.identifierLabel }}
                  </p>
                  <p class="mt-1 text-[10px] leading-4 text-slate-600">
                    {{ entity.profileStatusLabel }}
                  </p>
                </div>
                <span class="rounded-full bg-rose-300/15 px-2 py-1 text-[10px] font-semibold text-rose-100">
                  {{ entity.metrics.affinity }}/{{ entity.metrics.trust }}/{{ entity.metrics.intimacy }}
                </span>
              </div>
              <p class="mt-2 text-[11px] leading-4 text-slate-400">
                {{ t('Metrics: affinity/trust/intimacy/tension/dependency', 'Metrics: affinity/trust/intimacy/tension/dependency') }}
                {{ entity.metrics.affinity }}/{{ entity.metrics.trust }}/{{ entity.metrics.intimacy }}/{{ entity.metrics.tension }}/{{ entity.metrics.dependency }}
              </p>
              <p
                v-if="entity.primaryMemorySummaryText"
                class="mt-1 text-[11px] leading-4 text-rose-100/85"
              >
                {{
                  t(
                    `Shared memory: ${entity.primaryMemorySummaryText}`,
                    `Shared memory: ${entity.primaryMemorySummaryText}`,
                  )
                }}
              </p>
              <p
                v-else-if="entity.archiveOnlyHint"
                class="mt-1 text-[11px] leading-4 text-slate-400"
              >
                {{ entity.archiveOnlyHint }}
              </p>
              <div
                v-if="entity.primaryMemoryStatusLabel"
                class="mt-2 flex flex-wrap items-center gap-2"
              >
                <span
                  class="rounded-full px-2 py-1 text-[10px] font-semibold"
                  :class="entity.primaryMemoryStatusClass"
                >
                  {{ entity.primaryMemoryStatusLabel }}
                </span>
                <span
                  v-if="entity.primaryMemoryReviewNote"
                  class="text-[10px] leading-4 text-slate-300"
                >
                  {{ entity.primaryMemoryReviewNote }}
                </span>
              </div>
              <p class="mt-1 text-[10px] text-slate-600">
                {{ t('Updated', 'Updated') }}: {{ entity.updatedAtLabel }}
              </p>
              <div class="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  class="rounded-full bg-rose-300 px-3 py-1.5 text-[11px] font-semibold text-slate-950"
                  :data-testid="`control-center-relationship-reset-${entity.entityKey}`"
                  @click="resetRuntimeEntityFromWorldHub(entity)"
                >
                  {{ t('重置上下文', 'Reset context') }}
                </button>
                <button
                  v-if="entity.managementMemory"
                  type="button"
                  class="rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-semibold text-slate-200"
                  :data-testid="`control-center-relationship-delete-memory-${entity.entityKey}-${entity.managementMemory.memoryKey}`"
                  @click="deleteRuntimeMemoryFromWorldHub(entity, entity.managementMemory)"
                >
                  {{ t('删除这段记忆', 'Delete memory') }}
                </button>
              </div>
            </article>
          </div>
          <p v-else class="mt-3 rounded-2xl bg-white/8 px-3 py-3 text-xs leading-5 text-slate-400">
            {{ t('No relationship entities yet. Record a shopping gift or food-delivery shared meal to create snapshots here.', 'No relationship entities yet. Record a shopping gift or food-delivery shared meal to create snapshots here.') }}
          </p>
        </div>

        <div class="mt-3 rounded-2xl border border-white/10 bg-slate-950/35 p-3">
          <div class="flex items-center justify-between gap-3">
            <p class="text-xs font-semibold text-slate-100">
              {{ t('Recent relationship facts', 'Recent relationship facts') }}
            </p>
            <span class="text-[11px] text-slate-500">{{ t('Filtered review', 'Filtered review') }}</span>
          </div>
          <div
            class="mt-3 grid grid-cols-2 gap-2"
            data-testid="control-center-relationship-filters"
          >
            <label class="text-[11px] text-slate-400">
              {{ t('Status', 'Status') }}
              <select
                v-model="relationshipEventStatusFilter"
                class="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 px-2 py-2 text-xs text-white"
                data-testid="control-center-relationship-status-filter"
              >
                <option
                  v-for="option in relationshipEventStatusOptions"
                  :key="option.value"
                  :value="option.value"
                >
                  {{ option.label }}
                </option>
              </select>
            </label>
            <label class="text-[11px] text-slate-400">
              {{ t('Source', 'Source') }}
              <select
                v-model="relationshipEventSourceFilter"
                class="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 px-2 py-2 text-xs text-white"
                data-testid="control-center-relationship-source-filter"
              >
                <option
                  v-for="option in relationshipEventSourceOptions"
                  :key="option.value"
                  :value="option.value"
                >
                  {{ option.label }}
                </option>
              </select>
            </label>
          </div>
          <div v-if="relationshipRuntimeEventRows.length" class="mt-3 space-y-2">
            <article
              v-for="event in relationshipRuntimeEventRows"
              :key="event.id"
              class="rounded-2xl border p-3"
              :class="selectedRelationshipEvent?.id === event.id ? 'border-rose-200/70 bg-rose-200/10' : 'border-white/10 bg-white/8'"
              data-testid="control-center-relationship-event"
              @click="selectedRelationshipEventId = event.id"
            >
              <div class="flex items-start justify-between gap-3">
                <div>
                  <p class="text-xs font-semibold text-white">{{ event.factTypeLabel }}</p>
                  <p class="mt-1 text-[11px] text-slate-500">
                    {{ event.sourceLabel }} / {{ event.targetLabel || event.entityKey }}
                  </p>
                </div>
                <span
                  class="shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold"
                  :class="event.statusClass"
                >
                  {{ event.statusLabel }}
                </span>
              </div>
              <p class="mt-2 text-[11px] leading-4 text-slate-400">
                {{ event.summary || event.sourceId }}
              </p>
              <p class="mt-1 text-[10px] leading-4 text-slate-600">
                  {{ event.createdAtLabel }} / source={{ event.sourceModule }} / {{ event.sourceId || '-' }}
                </p>
              <div v-if="event.canReview" class="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  class="rounded-full bg-emerald-300 px-3 py-1.5 text-[11px] font-semibold text-slate-950"
                  :data-testid="`control-center-relationship-apply-${event.id}`"
                  @click="applyRelationshipEvent(event.id)"
                >
                  {{ t('Apply', 'Apply') }}
                </button>
                <button
                  type="button"
                  class="rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-semibold text-slate-200"
                  :data-testid="`control-center-relationship-dismiss-${event.id}`"
                  @click="dismissRelationshipEvent(event.id)"
                >
                  {{ t('Dismiss', 'Dismiss') }}
                </button>
              </div>
            </article>
          </div>
          <p v-else class="mt-3 rounded-2xl bg-white/8 px-3 py-3 text-xs leading-5 text-slate-400">
            {{ t('No relationship facts yet. This area only shows relationship facts explicitly submitted by modules.', 'No relationship facts yet. This area only shows relationship facts explicitly submitted by modules.') }}
          </p>
          <article
            v-if="selectedRelationshipEvent"
            class="mt-3 rounded-2xl border border-rose-200/20 bg-rose-200/8 p-3"
            data-testid="control-center-relationship-detail"
          >
            <div class="flex items-start justify-between gap-3">
              <div>
                <p class="text-xs font-semibold text-white">{{ t('Relationship fact detail', 'Relationship fact detail') }}</p>
                <p class="mt-1 text-[11px] text-slate-400">
                  {{ selectedRelationshipEvent.factTypeLabel }} / {{ selectedRelationshipEvent.statusLabel }}
                </p>
              </div>
              <span
                class="rounded-full px-2 py-1 text-[10px] font-semibold"
                :class="selectedRelationshipEvent.statusClass"
              >
                {{ selectedRelationshipEvent.statusLabel }}
              </span>
            </div>
            <p class="mt-2 text-[11px] leading-4 text-slate-300">
              {{ selectedRelationshipEvent.explanation }}
            </p>
            <div class="mt-3 grid gap-2 text-[11px]">
              <span class="rounded-xl bg-white/8 px-3 py-2">
                {{ t('Target', 'Target') }}:
                {{ selectedRelationshipEvent.targetLabel || selectedRelationshipEvent.entityKey }}
              </span>
              <span class="rounded-xl bg-white/8 px-3 py-2">
                {{ t('Metric delta', 'Metric delta') }}:
                {{ selectedRelationshipEvent.metricDeltaText }}
              </span>
              <span class="rounded-xl bg-white/8 px-3 py-2">
                {{ t('Source record', 'Source record') }}:
                {{ selectedRelationshipEvent.sourceModule }} / {{ selectedRelationshipEvent.sourceId || '-' }}
              </span>
            </div>
            <ul class="mt-3 space-y-1 text-[11px] leading-4 text-slate-400">
              <li
                v-for="note in selectedRelationshipEvent.safetyNotes"
                :key="note"
              >
                {{ note }}
              </li>
            </ul>
          </article>
        </div>
      </section>

      <section class="grid gap-3">
        <article class="rounded-2xl border border-white/10 bg-white/8 p-4">
          <p class="text-sm font-semibold">{{ t('Event Control', 'Event Control') }}</p>
          <p class="mt-1 text-xs leading-5 text-slate-400">
            {{ t('Later this connects world event packs, random trigger frequency, module adapter toggles, and event log review.', 'Later this connects world event packs, random trigger frequency, module adapter toggles, and event log review.') }}
          </p>
        </article>
        <article class="rounded-2xl border border-white/10 bg-white/8 p-4">
          <p class="text-sm font-semibold">{{ t('Value Control', 'Value Control') }}</p>
          <p class="mt-1 text-xs leading-5 text-slate-400">
            {{ t('Later this can host optional game-like data such as affinity, funds, asset states, and quest unlocks.', 'Later this can host optional game-like data such as affinity, funds, asset states, and quest unlocks.') }}
          </p>
        </article>
        <article class="rounded-2xl border border-white/10 bg-white/8 p-4">
          <p class="text-sm font-semibold">{{ t('Immersion Boundary', 'Immersion Boundary') }}</p>
          <p class="mt-1 text-xs leading-5 text-slate-400">
            {{ t('Data intake stays inside each immersive module; World Hub only coordinates, reviews, and overrides runtime behavior.', 'Data intake stays inside each immersive module; World Hub only coordinates, reviews, and overrides runtime behavior.') }}
          </p>
        </article>
      </section>

      <section
        class="rounded-2xl border border-white/10 bg-slate-900/80 p-4"
        data-testid="control-center-module-status"
      >
        <div class="flex items-center justify-between gap-3">
          <p class="text-xs font-semibold text-slate-200">{{ t('Module Event Wiring', 'Module Event Wiring') }}</p>
          <span class="text-[11px] text-slate-500">{{ t('Reads module flags', 'Reads module flags') }}</span>
        </div>
        <div class="mt-3 space-y-2">
          <article
            v-for="item in moduleRuntimeStatuses"
            :key="item.key"
            class="rounded-2xl bg-white/8 px-3 py-3"
            data-testid="control-center-module-status-item"
          >
            <div class="flex items-center justify-between gap-3">
              <div>
                <p class="text-xs font-semibold text-white">{{ item.label }}</p>
                <p class="mt-1 text-[11px] leading-4 text-slate-500">{{ item.description }}</p>
              </div>
              <span
                class="shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold"
                :class="item.enabled ? 'bg-emerald-300/15 text-emerald-100' : 'bg-white/10 text-slate-400'"
              >
                {{ item.statusLabel }}
              </span>
            </div>
          </article>
        </div>
      </section>

      <section
        class="rounded-2xl border border-white/10 bg-slate-900/80 p-4"
        data-testid="control-center-world-panel"
      >
        <p class="text-xs font-semibold text-slate-200">{{ t('World Variant Runtime', 'World Variant Runtime') }}</p>
        <div class="mt-3 grid grid-cols-2 gap-2 text-xs">
          <span class="rounded-xl bg-white/8 px-3 py-2">
            {{ t('Variant logs', 'Variant logs') }}: {{ worldRuntimeSummary.count }}
          </span>
          <span class="rounded-xl bg-white/8 px-3 py-2">
            {{ t('World context', 'World context') }}: {{ worldRuntimeSummary.worldContextId }}
          </span>
          <span class="col-span-2 rounded-xl bg-white/8 px-3 py-2">
            {{ t('Latest variant', 'Latest variant') }}: {{ worldRuntimeSummary.variantId }}
          </span>
          <span class="col-span-2 rounded-xl bg-white/8 px-3 py-2">
            {{ t('Active WorldBook entries', 'Active WorldBook entries') }}:
            {{ worldRuntimeSummary.activeWorldBookCount }}
          </span>
        </div>
      </section>

      <section
        class="rounded-2xl border border-white/10 bg-slate-900/80 p-4"
        data-testid="control-center-event-log-panel"
      >
        <div class="flex items-center justify-between gap-3">
          <p class="text-xs font-semibold text-slate-200">{{ t('Recent Event Logs', 'Recent Event Logs') }}</p>
          <span class="text-[11px] text-slate-500">{{ t('Filtered review', 'Filtered review') }}</span>
        </div>
        <div
          class="mt-3 grid grid-cols-2 gap-2"
          data-testid="control-center-event-log-filters"
        >
          <label class="text-[11px] text-slate-400">
            {{ t('Module', 'Module') }}
            <select
              v-model="eventLogModuleFilter"
              class="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 px-2 py-2 text-xs text-white"
              data-testid="control-center-event-log-module-filter"
            >
              <option
                v-for="option in eventLogModuleOptions"
                :key="option.value"
                :value="option.value"
              >
                {{ option.label }}
              </option>
            </select>
          </label>
          <label class="text-[11px] text-slate-400">
            {{ t('Status', 'Status') }}
            <select
              v-model="eventLogStatusFilter"
              class="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 px-2 py-2 text-xs text-white"
              data-testid="control-center-event-log-status-filter"
            >
              <option
                v-for="option in eventLogStatusOptions"
                :key="option.value"
                :value="option.value"
              >
                {{ option.label }}
              </option>
            </select>
          </label>
        </div>
        <div v-if="recentRuntimeLogs.length" class="mt-3 space-y-2">
          <article
            v-for="log in recentRuntimeLogs"
            :key="log.id"
            class="rounded-2xl border p-3"
            :class="selectedRuntimeLog?.id === log.id ? 'border-cyan-200/70 bg-cyan-200/10' : 'border-white/10 bg-white/8'"
            data-testid="control-center-event-log-item"
            @click="selectedEventLogId = log.id"
          >
            <div class="flex items-start justify-between gap-3">
              <div>
                <p class="text-xs font-semibold text-white">{{ log.eventLabel }}</p>
                <p class="mt-1 text-[11px] text-slate-500">
                  {{ log.moduleLabel }} / {{ log.triggerSourceLabel }} / {{ log.targetLabel }}
                </p>
              </div>
              <span
                class="shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold"
                :class="log.statusClass"
              >
                {{ log.statusLabel }}
              </span>
            </div>
            <p class="mt-2 text-[11px] leading-4 text-slate-400">
              {{ log.reasonLabel }}
            </p>
            <p v-if="log.variantLabel" class="mt-1 text-[11px] leading-4 text-cyan-100/80">
              {{ t('Variant', 'Variant') }}: {{ log.variantLabel }}
            </p>
            <p class="mt-1 text-[10px] leading-4 text-slate-600">
              {{ log.createdAtLabel }} / eventId={{ log.eventId || '-' }} / adapter={{ log.adapterKey || '-' }}
            </p>
          </article>
        </div>
        <p v-else class="mt-3 rounded-2xl bg-white/8 px-3 py-3 text-xs leading-5 text-slate-400">
          {{ t('No event logs yet. Run a diagnostics tick or a module event to see read-only records here.', 'No event logs yet. Run a diagnostics tick or a module event to see read-only records here.') }}
        </p>
        <article
          v-if="selectedRuntimeLog"
          class="mt-3 rounded-2xl border border-cyan-200/20 bg-cyan-200/8 p-3"
          data-testid="control-center-event-log-detail"
        >
          <div class="flex items-start justify-between gap-3">
            <div>
              <p class="text-xs font-semibold text-white">{{ t('Event log detail', 'Event log detail') }}</p>
              <p class="mt-1 text-[11px] text-slate-400">
                {{ selectedRuntimeLog.eventLabel }} / {{ selectedRuntimeLog.moduleLabel }}
              </p>
            </div>
            <span
              class="rounded-full px-2 py-1 text-[10px] font-semibold"
              :class="selectedRuntimeLog.statusClass"
            >
              {{ selectedRuntimeLog.statusLabel }}
            </span>
          </div>
          <p class="mt-2 text-[11px] leading-4 text-slate-300">
            {{ selectedRuntimeLog.explanation }}
          </p>
          <div class="mt-3 grid gap-2 text-[11px]">
            <span class="rounded-xl bg-white/8 px-3 py-2">
              {{ t('Reason', 'Reason') }}: {{ selectedRuntimeLog.reasonLabel }}
            </span>
            <span class="rounded-xl bg-white/8 px-3 py-2">
              {{ t('Target', 'Target') }}: {{ selectedRuntimeLog.targetLabel }}
            </span>
            <span class="rounded-xl bg-white/8 px-3 py-2">
              {{ t('Trigger source', 'Trigger source') }}: {{ selectedRuntimeLog.triggerSourceLabel }}
            </span>
            <span
              v-if="selectedRuntimeLog.variantLabel"
              class="rounded-xl bg-white/8 px-3 py-2"
            >
              {{ t('Variant', 'Variant') }}: {{ selectedRuntimeLog.variantLabel }}
            </span>
          </div>
          <ul class="mt-3 space-y-1 text-[11px] leading-4 text-slate-400">
            <li
              v-for="note in selectedRuntimeLog.safetyNotes"
              :key="note"
            >
              {{ note }}
            </li>
          </ul>
        </article>
      </section>

      <section class="rounded-2xl border border-white/10 bg-slate-900/80 p-4">
        <p class="text-xs font-semibold text-slate-200">{{ t('Current Wiring', 'Current Wiring') }}</p>
        <div class="mt-3 grid grid-cols-2 gap-2 text-xs">
          <span class="rounded-xl bg-white/8 px-3 py-2">{{ t('Home entry: optional', 'Home entry: optional') }}</span>
          <span class="rounded-xl bg-white/8 px-3 py-2">
            {{ homeEntryVisible ? t('主屏入口：显示', 'Home entry: visible') : t('主屏入口：库内', 'Home entry: in library') }}
          </span>
          <span class="rounded-xl bg-white/8 px-3 py-2">{{ t('Event engine: read-only', 'Event engine: read-only') }}</span>
          <span class="rounded-xl bg-white/8 px-3 py-2">{{ t('Values panel: pending', 'Values panel: pending') }}</span>
        </div>
      </section>
    </main>
  </div>
</template>
