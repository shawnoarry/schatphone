<script setup>
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from '../composables/useI18n'
import { pushReturnTarget } from '../lib/navigation-return'
import {
  RELATIONSHIP_EVENT_STATUS,
  useRelationshipRuntimeStore,
} from '../stores/relationshipRuntime'
import { useSystemStore } from '../stores/system'
import {
  SIMULATION_EVENT_STATUS,
  SIMULATION_SURPRISE_MODE,
  useSimulationStore,
} from '../stores/simulation'

const router = useRouter()
const route = useRoute()
const { t } = useI18n()
const systemStore = useSystemStore()
const relationshipRuntimeStore = useRelationshipRuntimeStore()
const simulationStore = useSimulationStore()

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

const enabled = computed(() => systemStore.isMoreFeatureToggleEnabled('control_center'))
const eventEngineEnabled = computed(
  () => settings.value.more?.featureToggles?.control_center === true,
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

const relationshipSourceLabel = (sourceModule = '') => {
  if (sourceModule === 'relationship_shopping_gift') return t('Shopping gift', 'Shopping gift')
  if (sourceModule === 'relationship_food_delivery_shared_meal')
    return t('Food Delivery shared meal', 'Food Delivery shared meal')
  if (sourceModule === 'relationship_phone_call') return t('Phone call', 'Phone call')
  if (sourceModule === 'relationship_map_shared_route') return t('Map shared route', 'Map shared route')
  if (sourceModule === 'relationship_wallet_shared_transfer')
    return t('Wallet shared transfer', 'Wallet shared transfer')
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

const relationshipRuntimeEntityRows = computed(() =>
  relationshipRuntimeStore.entities.slice(0, 4).map((entity) => ({
    ...entity,
    stageLabel: relationshipStageLabel(entity.relationshipStage),
    updatedAtLabel: formatRuntimeTime(entity.updatedAt),
  })),
)

const relationshipRuntimeEventRows = computed(() =>
  relationshipRuntimeStore.events.slice(0, 6).map((event) => ({
    ...event,
    sourceLabel: relationshipSourceLabel(event.sourceModule),
    factTypeLabel: relationshipFactTypeLabel(event.factType),
    statusLabel: relationshipEventStatusLabel(event.status),
    statusClass: relationshipEventStatusClass(event.status),
    canReview: event.status === RELATIONSHIP_EVENT_STATUS.PENDING_CONFIRMATION,
    createdAtLabel: formatRuntimeTime(event.createdAt),
  })),
)

const recentRuntimeLogs = computed(() =>
  recentEventLogs.value.slice(0, 6).map((log) => ({
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
  })),
)

const goHome = () => {
  pushReturnTarget(router, route, '/home')
}

const openMore = () => {
  router.push('/more')
}

const applyRelationshipEvent = (eventId) => {
  relationshipRuntimeStore.applyPendingRelationshipEvent(eventId)
}

const dismissRelationshipEvent = (eventId) => {
  relationshipRuntimeStore.dismissRelationshipEvent(eventId)
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
              {{ enabled ? t('Runtime Control Enabled', 'Runtime Control Enabled') : t('Runtime Control Disabled', 'Runtime Control Disabled') }}
            </p>
            <p class="mt-2 text-xs leading-5 text-slate-300">
              {{
                enabled
                  ? t(
                    'This is the shared observation and control entry for events, unlocks, money, affinity, and other play values; the current surface is read-only first.',
                    'This is the shared observation and control entry for events, unlocks, money, affinity, and other play values; the current surface is read-only first.',
                  )
                  : t(
                    'When disabled, Home hides the World Hub entry and regular Chat, Map, Shopping, Food Delivery, and other modules remain unaffected.',
                    'When disabled, Home hides the World Hub entry and regular Chat, Map, Shopping, Food Delivery, and other modules remain unaffected.',
                  )
              }}
            </p>
          </div>
          <span
            class="rounded-full px-3 py-1 text-[11px] font-semibold"
            :class="enabled ? 'bg-cyan-300 text-slate-950' : 'bg-white/10 text-slate-300'"
          >
            {{ enabled ? t('On', 'On') : t('Off', 'Off') }}
          </span>
        </div>
        <button
          v-if="!enabled"
          class="mt-4 rounded-full bg-white px-4 py-2 text-xs font-semibold text-slate-950"
          type="button"
          @click="openMore"
        >
          {{ t('Enable in More', 'Enable in More') }}
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
            {{ t('Read-only', 'Read-only') }}
          </span>
        </div>
        <p class="mt-2 text-xs leading-5 text-slate-300">
          {{ t('World Hub now reads relationship runtime state: role snapshots, recent relationship facts, and pending counts, without value editing or forced overrides.', 'World Hub now reads relationship runtime state: role snapshots, recent relationship facts, and pending counts, without value editing or forced overrides.') }}
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
                    {{ entity.stageLabel }} / {{ entity.entityKey }}
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
              <p class="mt-1 text-[10px] text-slate-600">
                {{ t('Updated', 'Updated') }}: {{ entity.updatedAtLabel }}
              </p>
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
            <span class="text-[11px] text-slate-500">{{ t('Latest 6', 'Latest 6') }}</span>
          </div>
          <div v-if="relationshipRuntimeEventRows.length" class="mt-3 space-y-2">
            <article
              v-for="event in relationshipRuntimeEventRows"
              :key="event.id"
              class="rounded-2xl border border-white/10 bg-white/8 p-3"
              data-testid="control-center-relationship-event"
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
          <span class="text-[11px] text-slate-500">{{ t('Latest 6', 'Latest 6') }}</span>
        </div>
        <div v-if="recentRuntimeLogs.length" class="mt-3 space-y-2">
          <article
            v-for="log in recentRuntimeLogs"
            :key="log.id"
            class="rounded-2xl border border-white/10 bg-white/8 p-3"
            data-testid="control-center-event-log-item"
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
      </section>

      <section class="rounded-2xl border border-white/10 bg-slate-900/80 p-4">
        <p class="text-xs font-semibold text-slate-200">{{ t('Current Wiring', 'Current Wiring') }}</p>
        <div class="mt-3 grid grid-cols-2 gap-2 text-xs">
          <span class="rounded-xl bg-white/8 px-3 py-2">{{ t('Home entry: optional', 'Home entry: optional') }}</span>
          <span class="rounded-xl bg-white/8 px-3 py-2">
            {{ eventEngineEnabled ? t('Settings toggle: on', 'Settings toggle: on') : t('Settings toggle: off', 'Settings toggle: off') }}
          </span>
          <span class="rounded-xl bg-white/8 px-3 py-2">{{ t('Event engine: read-only', 'Event engine: read-only') }}</span>
          <span class="rounded-xl bg-white/8 px-3 py-2">{{ t('Values panel: pending', 'Values panel: pending') }}</span>
        </div>
      </section>
    </main>
  </div>
</template>
