<script setup>
import { computed, onBeforeUnmount, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute, useRouter } from 'vue-router'
import { useSystemStore } from '../stores/system'
import { useChatStore } from '../stores/chat'
import { useFoodDeliveryStore } from '../stores/foodDelivery'
import { SIMULATION_SURPRISE_MODE, useSimulationStore } from '../stores/simulation'
import { useDialog } from '../composables/useDialog'
import { useI18n } from '../composables/useI18n'
import { useSettingsBackupWorkflow } from '../composables/useSettingsBackupWorkflow'
import { useSettingsPushWorkflow } from '../composables/useSettingsPushWorkflow'
import { useSettingsStorageDiagnosticsWorkflow } from '../composables/useSettingsStorageDiagnosticsWorkflow'
import { useSystemApiReports } from '../composables/useSystemApiReports'
import {
  BACKUP_REMINDER_INTERVAL_OPTIONS,
  createBackupReminderIntervalLabel,
  normalizeBackupReminderIntervalHours,
} from '../lib/backup-reminder-settings'
import SettingsAboutInfoCard from '../components/settings/SettingsAboutInfoCard.vue'
import SettingsAutomationSection from '../components/settings/SettingsAutomationSection.vue'
import SettingsBackupSection from '../components/settings/SettingsBackupSection.vue'
import SettingsGeneralSection from '../components/settings/SettingsGeneralSection.vue'
import SettingsLandingSection from '../components/settings/SettingsLandingSection.vue'
import SettingsPushSection from '../components/settings/SettingsPushSection.vue'
import SettingsSoftwareUpdateSection from '../components/settings/SettingsSoftwareUpdateSection.vue'
import SettingsStorageDiagnosticsSection from '../components/settings/SettingsStorageDiagnosticsSection.vue'
import SettingsSubPageHeader from '../components/settings/SettingsSubPageHeader.vue'
import {
  SCHATPHONE_BUILD_CHANNEL,
  SOFTWARE_UPDATE_RELEASE_NOTES,
} from '../lib/app-update'
import { runSimulationEventTick } from '../lib/simulation/event-tick-runner'
import { SIMULATION_FOREGROUND_TICK_MIN_INTERVAL_MS } from '../lib/simulation/foreground-session-tick'
import { buildReturnSourceQuery, pushReturnTarget } from '../lib/navigation-return'

const router = useRouter()
const route = useRoute()
const systemStore = useSystemStore()
const chatStore = useChatStore()
const foodDeliveryStore = useFoodDeliveryStore()
const simulationStore = useSimulationStore()
const { t } = useI18n()
const { confirmDialog } = useDialog()
const systemApiReports = useSystemApiReports({ systemStore })

const { settings, user } = storeToRefs(systemStore)

const {
  backupCopyTone,
  backupExporting,
  backupImporting,
  backupFileInput,
  backupFeedbackType,
  backupFeedbackMessage,
  backupIncludeAssetPackage,
  backupExportModeLabel,
  backupExportModeHint,
  backupPackageLimitHint,
  resolveBackupCopy,
  setBackupCopyTone,
  setBackupIncludeAssetPackage,
  exportData,
  triggerImportData,
  importData,
} = useSettingsBackupWorkflow({
  systemStore,
  chatStore,
  systemApiReports,
  t,
  confirmDialog,
})

const activeMenu = ref('')
const generalSaved = ref(false)
const automationSaved = ref(false)
const softwareUpdateFeedbackType = ref('')
const softwareUpdateFeedbackMessage = ref('')
let generalSavedTimerId = null
let automationSavedTimerId = null
let softwareUpdateFeedbackTimerId = null
const automationInitialMaster = ref(false)
const simulationTickRunning = ref(false)
const simulationTickLastResult = ref(null)
const simulationTickLastRunAt = ref(0)
const backupReminderIntervalOptions = BACKUP_REMINDER_INTERVAL_OPTIONS
const backupReminderIntervalLabel = createBackupReminderIntervalLabel(t)
const softwareUpdateState = computed(() => settings.value.system?.softwareUpdate || {})
const softwareUpdateReleaseNotes = SOFTWARE_UPDATE_RELEASE_NOTES
const softwareUpdateBuildChannel = SCHATPHONE_BUILD_CHANNEL

const setSoftwareUpdateFeedback = (type, message, durationMs = 2200) => {
  softwareUpdateFeedbackType.value = type
  softwareUpdateFeedbackMessage.value = message
  if (softwareUpdateFeedbackTimerId) clearTimeout(softwareUpdateFeedbackTimerId)
  softwareUpdateFeedbackTimerId = setTimeout(() => {
    softwareUpdateFeedbackType.value = ''
    softwareUpdateFeedbackMessage.value = ''
  }, durationMs)
}

const {
  notificationEnabled,
  notificationSaved,
  focusModeEnabled,
  webPushSupported,
  normalizedPushServerUrl,
  pushPermissionLabel,
  pushSubscriptionLabel,
  pushServerHealthLabel,
  pushCapabilityHint,
  pushDisplayModeHint,
  pushLastHealthCheckAt,
  pushServerHealthState,
  pushServerHealthMessage,
  pushFeedbackType,
  pushFeedbackMessage,
  pushActionRunning,
  pushHealthRunning,
  saveNotificationSettings,
  updateNotificationEnabled,
  updateFocusModeEnabled,
  updateRealPushEnabled,
  updatePushDisplayMode,
  updatePushServerUrl,
  checkPushServerHealthNow,
  resyncRealPushNow,
  subscribeRealPushNow,
  unsubscribeRealPushNow,
  sendRealPushTestNow,
  syncPushPermissionFromBrowser,
} = useSettingsPushWorkflow({
  systemStore,
  systemApiReports,
  t,
  confirmDialog,
})

const {
  persistenceCapabilities,
  persistenceCapabilityLabel,
  storageAuditRunning,
  storageRepairRunning,
  storageAuditResults,
  storageAuditAt,
  storageAuditFeedbackType,
  storageAuditFeedbackMessage,
  latestStorageReport,
  storageReportErrorCount,
  formatStorageAuditTime,
  formatStorageReportTime,
  storageReportReasonLabel,
  storageAuditStatusClass,
  storageAuditStatusLabel,
  storageLayerLabel,
  storageAuditSourceLabel,
  setStorageDiagnosticsFeedback,
  runStorageAudit,
  clearStorageReports,
  repairStorageDrift,
} = useSettingsStorageDiagnosticsWorkflow({
  systemStore,
  systemApiReports,
  t,
  confirmDialog,
})

const simulationTickResultLabel = computed(() => {
  const result = simulationTickLastResult.value
  if (!result) return t('尚未运行', 'Not run yet')
  if (result.ok) {
    return t(
      `已触发事件：${result.reason || 'simulation'}`,
      `Triggered event: ${result.reason || 'simulation'}`,
    )
  }
  return t(
    `本次未触发：${result.reason || 'no_event_triggered'}`,
    `No event triggered: ${result.reason || 'no_event_triggered'}`,
  )
})

const simulationModuleLabel = (moduleKey = '') => {
  if (moduleKey === 'chat') return t('聊天', 'Chat')
  if (moduleKey === 'food_delivery') return t('外卖', 'Food Delivery')
  if (moduleKey === 'shopping') return t('购物', 'Shopping')
  if (moduleKey === 'logistics') return t('物流', 'Logistics')
  if (moduleKey === 'simulation') return t('事件模拟', 'Simulation')
  return moduleKey || t('未知模块', 'Unknown module')
}

const simulationTriggerSourceLabel = (source = '') => {
  if (source === 'manual') return t('手动', 'Manual')
  if (source === 'condition') return t('条件触发', 'Condition')
  if (source === 'random') return t('随机触发', 'Random')
  if (source === 'scheduled') return t('定时/会话 Tick', 'Scheduled/session tick')
  if (source === 'ai_assisted') return t('AI 辅助', 'AI assisted')
  if (source === 'system') return t('系统', 'System')
  return source || t('未知来源', 'Unknown source')
}

const simulationEventStatusLabel = (status = '') => {
  if (status === 'triggered') return t('已触发', 'Triggered')
  if (status === 'skipped') return t('已跳过', 'Skipped')
  if (status === 'failed') return t('失败', 'Failed')
  return status || t('未知', 'Unknown')
}

const simulationEventReasonLabel = (reason = '') => {
  if (reason === 'eligible_non_random') return t('条件满足，已执行非随机事件', 'Eligible non-random event executed')
  if (reason === 'eligible_random_passed') return t('随机门槛通过，已执行事件', 'Random gate passed and event executed')
  if (reason === 'random_failed') return t('随机门槛未通过', 'Random gate did not pass')
  if (reason === 'random_missing') return t('缺少随机值，未执行随机事件', 'Missing random value, random event skipped')
  if (reason === 'probability_zero') return t('事件概率为 0', 'Event probability is zero')
  if (reason === 'trigger_source_not_allowed') return t('该触发来源未被事件允许', 'Trigger source is not allowed')
  if (reason === 'conditions_failed') return t('事件条件未满足', 'Event conditions were not met')
  if (reason === 'cooldown_active') return t('事件仍在冷却中', 'Event is still cooling down')
  if (reason === 'daily_limit_reached') return t('已达到每日上限', 'Daily limit reached')
  if (reason === 'surprise_mode_off') return t('惊喜模式关闭', 'Surprise Mode is off')
  if (reason === 'module_events_disabled') return t('该模块事件已关闭', 'Module events are disabled')
  if (reason === 'tick_cooldown_active') return t('会话 Tick 冷却中', 'Session tick is cooling down')
  if (reason === 'tick_daily_limit_reached') return t('会话 Tick 已达每日上限', 'Session tick daily limit reached')
  if (reason === 'no_active_order') return t('没有可作用的进行中订单', 'No active order available')
  if (reason === 'no_safe_preset') return t('没有可安全执行的事件预设', 'No safe event preset available')
  if (reason === 'adapter_missing') return t('缺少事件适配器', 'Event adapter is missing')
  if (reason === 'adapter_threw') return t('事件适配器执行异常', 'Event adapter threw an error')
  if (reason === 'adapter_returned_empty') return t('适配器未返回有效结果', 'Adapter returned no result')
  return reason || t('未记录原因', 'No reason recorded')
}

const simulationEventLabel = (eventId = '') => {
  if (eventId === 'simulation.session_tick.v1') return t('会话事件 Tick', 'Session event tick')
  if (eventId === 'chat.social.runtime_greeting_pilot.v1')
    return t('Chat 角色主动联系 Pilot', 'Chat role proactive contact pilot')
  if (eventId === 'chat.social.role_greeting_request.v1')
    return t('Chat 角色问候请求', 'Chat role greeting request')
  if (eventId === 'chat.social.role_refuse_messages.v1')
    return t('Chat 角色拒收消息', 'Chat role refused messages')
  if (eventId === 'chat.social.role_restore_messages.v1')
    return t('Chat 角色恢复消息', 'Chat role restored messages')
  if (eventId === 'chat.social.role_block_user.v1')
    return t('Chat 角色拉黑用户', 'Chat role blocked user')
  if (eventId === 'chat.social.role_unblock_user.v1')
    return t('Chat 角色取消拉黑', 'Chat role unblocked user')
  if (eventId === 'food_delivery.random_order_pilot.v1')
    return t('外卖随机订单 Pilot', 'Food Delivery random order pilot')
  if (eventId === 'food_delivery.eta_update.v1') return t('外卖 ETA 更新', 'Food Delivery ETA update')
  if (eventId === 'food_delivery.rider_delay.v1') return t('外卖骑手延迟', 'Food Delivery rider delay')
  if (eventId === 'food_delivery.restaurant_cancelled.v1')
    return t('外卖商家取消', 'Food Delivery restaurant cancelled')
  if (eventId === 'food_delivery.address_change.v1')
    return t('外卖地址变更', 'Food Delivery address change')
  if (eventId === 'food_delivery.status_update.v1')
    return t('外卖状态更新', 'Food Delivery status update')
  if (eventId === 'shopping.logistics.package_shipped.v1')
    return t('购物物流发货', 'Shopping package shipped')
  if (eventId === 'shopping.logistics.package_arrived.v1')
    return t('购物物流到达', 'Shopping package arrived')
  if (eventId === 'shopping.logistics.pickup_point_changed.v1')
    return t('购物取件点变更', 'Shopping pickup point changed')
  if (eventId === 'shopping.logistics.international_delay.v1')
    return t('国际物流延迟', 'International logistics delay')
  return eventId || t('未知事件', 'Unknown event')
}

const simulationEventTargetLabel = (log = {}) => {
  const targetId = typeof log.targetId === 'string' ? log.targetId.trim() : ''
  if (!targetId) return t('全局/无特定目标', 'Global / no specific target')
  if (targetId === 'global') return t('全局会话', 'Global session')
  return targetId
}

const simulationEventVariantLabel = (log = {}) => {
  const parts = [log.worldContextId, log.variantId, log.variantPackId]
    .filter((item) => typeof item === 'string' && item.trim())
  return parts.join(' · ')
}

const simulationEventLogsForDiagnostics = computed(() =>
  simulationStore.recentEventLogs.slice(0, 8).map((log) => ({
    ...log,
    eventLabel: simulationEventLabel(log.eventId),
    moduleLabel: simulationModuleLabel(log.moduleKey),
    triggerSourceLabel: simulationTriggerSourceLabel(log.triggerSource),
    statusLabel: simulationEventStatusLabel(log.status),
    reasonLabel: simulationEventReasonLabel(log.reason),
    targetLabel: simulationEventTargetLabel(log),
    variantLabel: simulationEventVariantLabel(log),
    technicalSummary: [
      `eventId=${log.eventId || '-'}`,
      `adapter=${log.adapterKey || '-'}`,
      `reason=${log.reason || '-'}`,
    ].join(' · '),
  })),
)

const runSimulationTickDiagnostic = async () => {
  if (simulationTickRunning.value) return
  simulationTickRunning.value = true
  try {
    const result = runSimulationEventTick({
      simulationStore,
      foodDeliveryStore,
      chatStore,
      now: Date.now(),
      randomValue: 0,
    })
    simulationTickLastResult.value = result
    simulationTickLastRunAt.value = Date.now()
    const ok = result?.ok === true
    const reason = typeof result?.reason === 'string' && result.reason.trim()
      ? result.reason.trim()
      : ok
        ? 'triggered'
        : 'skipped'
    const pilotCount = Array.isArray(result?.pilotResults) ? result.pilotResults.length : 0

    systemApiReports.addReport({
      level: ok ? 'info' : 'error',
      module: 'simulation',
      action: 'run_event_tick',
      provider: 'local_event_engine',
      model: `pilots:${pilotCount}`,
      code: ok ? 'SIMULATION_TICK_TRIGGERED' : 'SIMULATION_TICK_SKIPPED',
      message: ok
        ? t(
            `事件 tick 已触发：${reason}。`,
            `Simulation tick triggered: ${reason}.`,
          )
        : t(
            `事件 tick 未触发：${reason}。`,
            `Simulation tick skipped: ${reason}.`,
          ),
      createdAt: simulationTickLastRunAt.value,
    })

    setStorageDiagnosticsFeedback(
      ok ? 'success' : 'warn',
      ok
        ? t('事件 tick 已运行并触发安全事件。', 'Event tick ran and triggered a safe event.')
        : t(`事件 tick 已运行但未触发：${reason}。`, `Event tick ran without trigger: ${reason}.`),
    )
  } finally {
    simulationTickRunning.value = false
  }
}

const goHome = () => {
  pushReturnTarget(router, route, '/home')
}

const normalizeSettingsMenuFromQuery = (value) => {
  const raw = typeof value === 'string' ? value.trim() : ''
  const allowed = new Set(['general', 'notification', 'automation', 'about', 'software-update'])
  return allowed.has(raw) ? raw : ''
}

const openSubPage = (menu) => {
  activeMenu.value = menu
  if (menu === 'automation') {
    automationInitialMaster.value = Boolean(settings.value.aiAutomation?.masterEnabled)
  }
  if (menu === 'notification') {
    syncPushPermissionFromBrowser()
    void checkPushServerHealthNow({ silent: true })
    if (settings.value.system?.realPushEnabled && settings.value.system?.pushDeviceId) {
      void resyncRealPushNow({ silent: true })
    }
  }
  if (menu === 'about') {
    void runStorageAudit({ silent: true })
  }
}

const closeSubPage = () => {
  activeMenu.value = ''
}

const openProfile = () => {
  router.push({
    path: '/profile',
    query: buildReturnSourceQuery('settings', route),
  })
}

const openWorldBook = () => {
  router.push({
    path: '/worldbook',
    query: buildReturnSourceQuery('settings', route),
  })
}

const saveGeneralSettings = () => {
  settings.value.system.backupReminderIntervalHours = normalizeBackupReminderIntervalHours(
    settings.value.system.backupReminderIntervalHours,
  )
  settings.value.system.backupReminderEnabled = settings.value.system.backupReminderEnabled !== false
  systemStore.saveNow()
  generalSaved.value = true
  if (generalSavedTimerId) clearTimeout(generalSavedTimerId)
  generalSavedTimerId = setTimeout(() => {
    generalSaved.value = false
  }, 1200)
}

const checkSoftwareUpdateNow = () => {
  const result = systemStore.checkSoftwareUpdate(Date.now())
  systemStore.saveNow()
  setSoftwareUpdateFeedback(
    result.updateAvailable ? 'success' : 'info',
    result.updateAvailable
      ? t('已找到可用更新。', 'Update available.')
      : t('当前已经是最新版本。', 'SchatPhone is up to date.'),
  )
}

const installSoftwareUpdateNow = () => {
  const result = systemStore.installSoftwareUpdate(Date.now())
  systemStore.saveNow()
  if (!result.ok) {
    setSoftwareUpdateFeedback(
      'warn',
      t('没有可安装的新版本。', 'No new version is available to install.'),
    )
    return
  }
  setSoftwareUpdateFeedback(
    'success',
    t('更新已安装，重启后生效。', 'Update installed. Restart to finish.'),
  )
}

const postponeSoftwareUpdateNow = () => {
  systemStore.postponeSoftwareUpdate(Date.now())
  systemStore.saveNow()
  setSoftwareUpdateFeedback('info', t('已改为稍后处理。', 'Update postponed.'))
}

const restartIntoSoftwareUpdate = () => {
  systemStore.finishSoftwareUpdateRestart(Date.now())
  systemStore.saveNow()
  if (typeof window !== 'undefined' && typeof window.location?.reload === 'function') {
    window.location.reload()
  }
}

const clampAutomationPriority = (value) => {
  const num = Number(value)
  if (!Number.isFinite(num)) return 100
  return Math.min(1000, Math.max(1, Math.floor(num)))
}

const clampAutomationSeconds = (value, fallback = 120) => {
  const num = Number(value)
  if (!Number.isFinite(num)) return fallback
  return Math.min(1800, Math.max(10, Math.floor(num)))
}

const normalizeAutomationClock = (value, fallback = '00:00') => {
  if (typeof value !== 'string') return fallback
  const match = value.trim().match(/^([01]?\d|2[0-3]):([0-5]\d)$/)
  if (!match) return fallback
  return `${match[1].padStart(2, '0')}:${match[2]}`
}

const automationRuntimePolicy = computed(() =>
  systemStore.getAiAutomationRuntimePolicy('chat', Date.now()),
)

const simulationForegroundTickIntervalMinutes = computed(() => {
  const intervalMs = Number(simulationStore.settings?.foregroundSessionTickIntervalMs)
  const safeIntervalMs = Number.isFinite(intervalMs) && intervalMs > 0
    ? intervalMs
    : 10 * 60 * 1000
  return Math.max(1, Math.round(safeIntervalMs / 60_000))
})

const simulationForegroundTickRuntimeLabel = computed(() => {
  const enabled = simulationStore.settings?.foregroundSessionTickEnabled === true
  const minutes = simulationForegroundTickIntervalMinutes.value
  if (!enabled) {
    return t(
      '事件前台 Tick / Foreground event tick 当前关闭。不会自动检查外卖安全事件或角色主动联系候选。',
      'Foreground event tick / 事件前台 Tick is currently off. Food Delivery safety events and Role proactive contact candidates are not checked automatically.',
    )
  }
  return t(
    `事件前台 Tick / Foreground event tick 已开启：当前每 ${minutes} 分钟检查一次外卖安全事件和角色主动联系候选。`,
    `Foreground event tick / 事件前台 Tick is on: safe Food Delivery events and Role proactive contact candidates are checked every ${minutes} minute(s).`,
  )
})

const simulationForegroundTickCoverageItems = computed(() => [
  {
    id: 'food_delivery_safety',
    label: t(
      '外卖安全事件 / Food Delivery safety events',
      'Food Delivery safety events / 外卖安全事件',
    ),
    status: t('已接入 / Active', 'Active / 已接入'),
    detail: t(
      '低风险外卖进度变化，例如 ETA 更新、骑手延迟、商家状态变化。',
      'Low-risk delivery updates, such as ETA changes, rider delays, and restaurant status changes.',
    ),
  },
  {
    id: 'role_proactive_contact',
    label: t(
      '角色主动联系候选 / Role proactive contact candidate',
      'Role proactive contact candidate / 角色主动联系候选',
    ),
    status: t('已接入 / Active', 'Active / 已接入'),
    detail: t(
      '陌生、曾拒绝或已解除限制的角色，可以被提议为主动联系你；后续仍进入 Chat 和世界中枢审查链。',
      'Stranger, declined, or restored roles can be proposed as incoming contacts; results still go through Chat and World Hub review.',
    ),
  },
])

const isSimulationForegroundTickLog = (log = {}) => {
  const eventId = typeof log.eventId === 'string' ? log.eventId : ''
  return (
    eventId === 'simulation.session_tick.v1'
    || eventId.startsWith('food_delivery.')
    || eventId.startsWith('chat.social.')
  )
}

const simulationForegroundTickLatestLabel = computed(() => {
  const latestLog = simulationStore.recentEventLogs.find(isSimulationForegroundTickLog)
  if (!latestLog) {
    return t(
      '最近结果 / Latest result：暂无前台 Tick 相关记录。',
      'Latest result / 最近结果: no foreground tick related record yet.',
    )
  }

  const eventLabel = simulationEventLabel(latestLog.eventId)
  const statusLabel = simulationEventStatusLabel(latestLog.status)
  const reasonLabel = simulationEventReasonLabel(latestLog.reason)
  return t(
    `最近结果 / Latest result：${eventLabel} · ${statusLabel} · ${reasonLabel}`,
    `Latest result / 最近结果: ${eventLabel} · ${statusLabel} · ${reasonLabel}`,
  )
})

const simulationSurpriseModeOptions = computed(() => [
  {
    value: SIMULATION_SURPRISE_MODE.OFF,
    label: t('关闭 / Off', 'Off / 关闭'),
    detail: t(
      '关闭随机和会话 Tick 事件检查，手动操作不受影响。',
      'Random and session tick event checks are off; manual actions are not affected.',
    ),
  },
  {
    value: SIMULATION_SURPRISE_MODE.LOW,
    label: t('低 / Low', 'Low / 低'),
    detail: t(
      '保守默认档，只允许低频、低风险的生活化事件。',
      'Conservative default: only low-frequency, low-risk life events are allowed.',
    ),
  },
  {
    value: SIMULATION_SURPRISE_MODE.BALANCED,
    label: t('平衡 / Balanced', 'Balanced / 平衡'),
    detail: t(
      '允许更活跃的随机生活感，但仍受冷却、上限和审查限制。',
      'Allows livelier random simulation while still respecting cooldowns, caps, and review.',
    ),
  },
  {
    value: SIMULATION_SURPRISE_MODE.HIGH,
    label: t('高 / High', 'High / 高'),
    detail: t(
      '预留给更强的世界活跃度；当前仍不会绕过安全审查。',
      'Reserved for stronger world activity; current safety review is still not bypassed.',
    ),
  },
])

const simulationSurpriseModeCurrentOption = computed(() => {
  const mode = simulationStore.settings?.surpriseMode || SIMULATION_SURPRISE_MODE.LOW
  return (
    simulationSurpriseModeOptions.value.find((option) => option.value === mode)
    || simulationSurpriseModeOptions.value.find((option) => option.value === SIMULATION_SURPRISE_MODE.LOW)
  )
})

const simulationSurpriseModeRuntimeLabel = computed(() => {
  const option = simulationSurpriseModeCurrentOption.value
  const label = option?.label || t('低 / Low', 'Low / 低')
  if (simulationStore.settings?.surpriseMode === SIMULATION_SURPRISE_MODE.OFF) {
    return t(
      `惊喜模式 / Surprise Mode：${label}。前台 Tick 会跳过随机和会话事件检查。`,
      `Surprise Mode / 惊喜模式: ${label}. Foreground Tick skips random and session event checks.`,
    )
  }
  return t(
    `惊喜模式 / Surprise Mode：${label}。事件仍受冷却、每日上限、模块权限和世界中枢审查限制。`,
    `Surprise Mode / 惊喜模式: ${label}. Events still respect cooldowns, daily caps, module permissions, and World Hub review.`,
  )
})

const simulationModuleEventControls = computed(() => [
  {
    id: 'chat',
    moduleKey: 'chat',
    label: t(
      'Chat 角色主动联系 / Chat role contact events',
      'Chat role contact events / Chat 角色主动联系',
    ),
    enabled: simulationStore.isModuleEventsEnabled('chat'),
    status: simulationStore.isModuleEventsEnabled('chat')
      ? t('允许 / Allowed', 'Allowed / 允许')
      : t('关闭 / Off', 'Off / 关闭'),
    detail: t(
      '允许 Chat AI 输出或前台 Tick 提议角色主动联系；高风险状态变化仍需世界中枢审查。',
      'Allows Chat AI output or foreground Tick to propose role contact events; high-risk state changes still require World Hub review.',
    ),
  },
  {
    id: 'food_delivery',
    moduleKey: 'food_delivery',
    label: t(
      '外卖安全事件 / Food Delivery safety events',
      'Food Delivery safety events / 外卖安全事件',
    ),
    enabled: simulationStore.isModuleEventsEnabled('food_delivery'),
    status: simulationStore.isModuleEventsEnabled('food_delivery')
      ? t('允许 / Allowed', 'Allowed / 允许')
      : t('关闭 / Off', 'Off / 关闭'),
    detail: t(
      '允许外卖订单产生低风险进度变化，例如 ETA 更新或骑手延迟。',
      'Allows low-risk delivery order updates, such as ETA changes or rider delays.',
    ),
  },
])

const updateSimulationSurpriseMode = (mode) => {
  simulationStore.setSurpriseMode(mode)
}

const updateSimulationModuleEventsEnabled = (moduleKey, enabled) => {
  simulationStore.setModuleEventsEnabled(moduleKey, enabled)
}

const updateSimulationForegroundTickEnabled = (enabled) => {
  simulationStore.setForegroundSessionTickEnabled(enabled)
}

const updateSimulationForegroundTickIntervalMinutes = (minutes) => {
  const value = Number(minutes)
  const safeMinutes = Number.isFinite(value) ? Math.max(1, Math.min(120, Math.floor(value))) : 10
  simulationStore.setForegroundSessionTickIntervalMs(
    Math.max(SIMULATION_FOREGROUND_TICK_MIN_INTERVAL_MS, safeMinutes * 60_000),
  )
}

const updateAutomationField = (field, value) => {
  if (!settings.value.aiAutomation || typeof field !== 'string' || !field) return
  settings.value.aiAutomation[field] = value
}

const updateAutomationModuleEnabled = (moduleKey, enabled) => {
  const moduleConfig = settings.value.aiAutomation?.modules?.[moduleKey]
  if (!moduleConfig) return
  moduleConfig.enabled = enabled === true
}

const updateAutomationModulePriority = (moduleKey, priority) => {
  const moduleConfig = settings.value.aiAutomation?.modules?.[moduleKey]
  if (!moduleConfig) return
  moduleConfig.priority = clampAutomationPriority(priority)
}

const saveAutomationSettings = async () => {
  if (!settings.value.aiAutomation) return

  if (!automationInitialMaster.value && settings.value.aiAutomation.masterEnabled) {
    const ok = await confirmDialog({
      title: t('开启 AI 自动响应', 'Enable AI automation'),
      message: t(
        '开启后会允许系统按配置自主触发 AI 调用，可能消耗 API 供应商额度。确认继续？',
        'Enabling this allows autonomous AI calls by configuration and may consume provider quota. Continue?',
      ),
      confirmText: t('确认开启', 'Enable'),
      cancelText: t('取消', 'Cancel'),
      tone: 'accent',
    })
    if (!ok) {
      settings.value.aiAutomation.masterEnabled = false
      return
    }
  }

  const modules = settings.value.aiAutomation.modules || {}
  Object.keys(modules).forEach((moduleKey) => {
    modules[moduleKey].priority = clampAutomationPriority(modules[moduleKey].priority)
  })
  settings.value.aiAutomation.conflictCooldownSec = clampAutomationSeconds(
    settings.value.aiAutomation.conflictCooldownSec,
    20,
  )
  settings.value.aiAutomation.dedupeWindowSec = clampAutomationSeconds(
    settings.value.aiAutomation.dedupeWindowSec,
    120,
  )
  settings.value.aiAutomation.quietHoursStart = normalizeAutomationClock(
    settings.value.aiAutomation.quietHoursStart,
    '23:00',
  )
  settings.value.aiAutomation.quietHoursEnd = normalizeAutomationClock(
    settings.value.aiAutomation.quietHoursEnd,
    '07:00',
  )
  updateSimulationForegroundTickEnabled(
    simulationStore.settings?.foregroundSessionTickEnabled === true,
  )
  updateSimulationForegroundTickIntervalMinutes(simulationForegroundTickIntervalMinutes.value)
  simulationStore.saveNow()

  systemStore.saveNow()
  automationSaved.value = true
  if (automationSavedTimerId) clearTimeout(automationSavedTimerId)
  automationSavedTimerId = setTimeout(() => {
    automationSaved.value = false
  }, 1200)
}

const openChatAutomation = () => {
  router.push('/chat-contacts')
}

const openWorldHub = () => {
  router.push({
    path: '/control-center',
    query: buildReturnSourceQuery('settings', route),
  })
}

const openNetworkReports = (moduleKey = 'all', levelKey = 'all') => {
  const normalizedModule = typeof moduleKey === 'string' ? moduleKey.trim() : 'all'
  const normalizedLevel = typeof levelKey === 'string' ? levelKey.trim() : 'all'
  if ((!normalizedModule || normalizedModule === 'all') && (!normalizedLevel || normalizedLevel === 'all')) {
    router.push({
      path: '/network',
      query: buildReturnSourceQuery('settings', route),
    })
    return
  }

  const query = {}
  if (normalizedModule && normalizedModule !== 'all') {
    query.reportModule = normalizedModule
  }
  if (normalizedLevel && normalizedLevel !== 'all') {
    query.reportLevel = normalizedLevel
  }

  router.push({
    path: '/network',
    query: buildReturnSourceQuery('settings', route, query),
  })
}

const openAppearanceStudio = () => {
  router.push({
    path: '/appearance',
    query: buildReturnSourceQuery('settings', route),
  })
}

onBeforeUnmount(() => {
  if (generalSavedTimerId) clearTimeout(generalSavedTimerId)
  if (automationSavedTimerId) clearTimeout(automationSavedTimerId)
  if (softwareUpdateFeedbackTimerId) clearTimeout(softwareUpdateFeedbackTimerId)
})

const initialMenu = normalizeSettingsMenuFromQuery(
  typeof route.query?.menu === 'string' ? route.query.menu : '',
)
if (initialMenu) {
  activeMenu.value = initialMenu
  if (initialMenu === 'automation') {
    automationInitialMaster.value = Boolean(settings.value.aiAutomation?.masterEnabled)
  }
  if (initialMenu === 'notification') {
    syncPushPermissionFromBrowser()
  }
  if (initialMenu === 'about') {
    void runStorageAudit({ silent: true })
  }
}
</script>

<template>
  <div class="settings-shell w-full h-full bg-[#f2f2f7] flex flex-col text-black">
    <div class="settings-header pt-12 pb-4 px-4 bg-white/80 backdrop-blur sticky top-0 z-10 border-b border-gray-200 flex items-center">
      <button @click="goHome" class="settings-nav-button mr-2 text-blue-500 flex items-center gap-1 text-sm font-medium">
        <i class="fas fa-chevron-left"></i> {{ t('主页', 'Home') }}
      </button>
      <h1 class="text-2xl font-bold flex-1">{{ t('设置', 'Settings') }}</h1>
    </div>

    <div class="settings-scroll flex-1 overflow-y-auto p-4 space-y-5 no-scrollbar">
      <SettingsLandingSection
        :user="user"
        @open-profile="openProfile"
        @open-worldbook="openWorldBook"
        @open-general="openSubPage('general')"
        @open-software-update="openSubPage('software-update')"
        @open-automation="openSubPage('automation')"
        @open-notification="openSubPage('notification')"
        @open-network="openNetworkReports"
        @open-chat-settings="openChatAutomation"
        @open-appearance="openAppearanceStudio"
      />

      <div class="settings-section-label px-1 text-[11px] text-gray-500 font-medium">{{ t('数据与安全', 'Data & Security') }}</div>
      <SettingsBackupSection
        :backup-copy-tone="backupCopyTone"
        :backup-include-asset-package="backupIncludeAssetPackage"
        :backup-exporting="backupExporting"
        :backup-importing="backupImporting"
        :backup-export-mode-label="backupExportModeLabel"
        :backup-export-mode-hint="backupExportModeHint"
        :backup-package-limit-hint="backupPackageLimitHint"
        :backup-feedback-type="backupFeedbackType"
        :backup-feedback-message="backupFeedbackMessage"
        :resolve-backup-copy="resolveBackupCopy"
        @update-backup-copy-tone="setBackupCopyTone"
        @update-include-asset-package="setBackupIncludeAssetPackage"
        @export-data="exportData"
        @trigger-import-data="triggerImportData"
        @open-about="openSubPage('about')"
      />
      <input
        ref="backupFileInput"
        type="file"
        accept="application/json"
        class="hidden"
        @change="importData"
      />

      <div v-if="activeMenu === 'general'" class="settings-subpage fixed inset-0 bg-[#f2f2f7] z-20 flex flex-col animate-slide-in">
        <SettingsGeneralSection
          :language="settings.system.language"
          :timezone="settings.system.timezone"
          :backup-reminder-enabled="settings.system.backupReminderEnabled"
          :backup-reminder-interval-hours="settings.system.backupReminderIntervalHours"
          :backup-reminder-interval-options="backupReminderIntervalOptions"
          :backup-reminder-interval-label="backupReminderIntervalLabel"
          :general-saved="generalSaved"
          @close="closeSubPage"
          @update-language="settings.system.language = $event"
          @update-timezone="settings.system.timezone = $event"
          @update-backup-reminder-enabled="settings.system.backupReminderEnabled = $event"
          @update-backup-reminder-interval-hours="settings.system.backupReminderIntervalHours = $event"
          @save="saveGeneralSettings"
        />
      </div>

      <div v-if="activeMenu === 'software-update'" class="settings-subpage fixed inset-0 bg-[#f2f2f7] z-20 flex flex-col animate-slide-in">
        <SettingsSubPageHeader
          title-zh="软件更新"
          title-en="Software Update"
          @close="closeSubPage"
        />
        <div class="settings-subpage-scroll p-4 space-y-4 overflow-y-auto no-scrollbar">
          <SettingsSoftwareUpdateSection
            :build-channel="softwareUpdateBuildChannel"
            :update-state="softwareUpdateState"
            :release-notes="softwareUpdateReleaseNotes"
            :feedback-type="softwareUpdateFeedbackType"
            :feedback-message="softwareUpdateFeedbackMessage"
            :format-time="formatStorageReportTime"
            @check-update="checkSoftwareUpdateNow"
            @install-update="installSoftwareUpdateNow"
            @postpone-update="postponeSoftwareUpdateNow"
            @restart-update="restartIntoSoftwareUpdate"
          />
        </div>
      </div>

      <div v-if="activeMenu === 'automation'" class="settings-subpage fixed inset-0 bg-[#f2f2f7] z-20 flex flex-col animate-slide-in">
        <SettingsSubPageHeader
          title-zh="AI 自动响应"
          title-en="AI Automation"
          @close="closeSubPage"
        />
        <div class="settings-subpage-scroll p-4 space-y-4 overflow-y-auto no-scrollbar">
          <SettingsAutomationSection
            :ai-automation="settings.aiAutomation"
            :automation-runtime-policy="automationRuntimePolicy"
            :simulation-settings="simulationStore.settings"
            :simulation-foreground-tick-interval-minutes="simulationForegroundTickIntervalMinutes"
            :simulation-foreground-tick-runtime-label="simulationForegroundTickRuntimeLabel"
            :simulation-foreground-tick-coverage-items="simulationForegroundTickCoverageItems"
            :simulation-foreground-tick-latest-label="simulationForegroundTickLatestLabel"
            :simulation-surprise-mode-options="simulationSurpriseModeOptions"
            :simulation-surprise-mode-runtime-label="simulationSurpriseModeRuntimeLabel"
            :simulation-module-event-controls="simulationModuleEventControls"
            :automation-saved="automationSaved"
            @update-automation-field="updateAutomationField"
            @update-module-enabled="updateAutomationModuleEnabled"
            @update-module-priority="updateAutomationModulePriority"
            @update-simulation-foreground-tick-enabled="updateSimulationForegroundTickEnabled"
            @update-simulation-foreground-tick-interval-minutes="updateSimulationForegroundTickIntervalMinutes"
            @update-simulation-surprise-mode="updateSimulationSurpriseMode"
            @update-simulation-module-events-enabled="updateSimulationModuleEventsEnabled"
            @open-chat-automation="openChatAutomation"
            @open-world-hub="openWorldHub"
            @open-network-reports="openNetworkReports"
            @save-automation-settings="saveAutomationSettings"
          />
        </div>
      </div>

      <div v-if="activeMenu === 'notification'" class="settings-subpage fixed inset-0 bg-[#f2f2f7] z-20 flex flex-col animate-slide-in">
        <SettingsSubPageHeader
          title-zh="通知"
          title-en="Notifications"
          @close="closeSubPage"
        />
        <div class="settings-subpage-scroll p-4 space-y-4 overflow-y-auto no-scrollbar">
          <SettingsPushSection
            :settings="settings"
            :notification-enabled="notificationEnabled"
            :web-push-supported="webPushSupported"
            :push-permission-label="pushPermissionLabel"
            :push-subscription-label="pushSubscriptionLabel"
            :push-server-health-label="pushServerHealthLabel"
            :push-capability-hint="pushCapabilityHint"
            :push-display-mode-hint="pushDisplayModeHint"
            :normalized-push-server-url="normalizedPushServerUrl"
            :push-last-health-check-at="pushLastHealthCheckAt"
            :push-server-health-state="pushServerHealthState"
            :push-server-health-message="pushServerHealthMessage"
            :push-feedback-type="pushFeedbackType"
            :push-feedback-message="pushFeedbackMessage"
            :push-action-running="pushActionRunning"
            :push-health-running="pushHealthRunning"
            :notification-saved="notificationSaved"
            :focus-mode-enabled="focusModeEnabled"
            :format-storage-report-time="formatStorageReportTime"
            @update-notifications="updateNotificationEnabled"
            @update-focus-mode="updateFocusModeEnabled"
            @update-real-push-enabled="updateRealPushEnabled"
            @update-push-display-mode="updatePushDisplayMode"
            @update-push-server-url="updatePushServerUrl"
            @check-push-server-health="checkPushServerHealthNow()"
            @resync-real-push="resyncRealPushNow()"
            @subscribe-real-push="subscribeRealPushNow"
            @send-real-push-test="sendRealPushTestNow"
            @unsubscribe-real-push="unsubscribeRealPushNow"
            @save-notification-settings="saveNotificationSettings"
          />
        </div>
      </div>

      <div v-if="activeMenu === 'about'" class="settings-subpage fixed inset-0 bg-[#f2f2f7] z-20 flex flex-col animate-slide-in">
        <SettingsSubPageHeader
          title-zh="关于"
          title-en="About"
          @close="closeSubPage"
        />
        <div class="settings-subpage-scroll p-4 space-y-4 overflow-y-auto no-scrollbar">
          <SettingsAboutInfoCard />
          <SettingsStorageDiagnosticsSection
            :persistence-capabilities="persistenceCapabilities"
            :storage-audit-running="storageAuditRunning"
            :storage-repair-running="storageRepairRunning"
            :storage-audit-at="storageAuditAt"
            :storage-audit-feedback-type="storageAuditFeedbackType"
            :storage-audit-feedback-message="storageAuditFeedbackMessage"
            :simulation-tick-running="simulationTickRunning"
            :simulation-tick-last-run-at="simulationTickLastRunAt"
            :simulation-tick-result-label="simulationTickResultLabel"
            :simulation-event-logs="simulationEventLogsForDiagnostics"
            :latest-storage-report="latestStorageReport"
            :storage-report-error-count="storageReportErrorCount"
            :storage-audit-results="storageAuditResults"
            :persistence-capability-label="persistenceCapabilityLabel"
            :format-storage-audit-time="formatStorageAuditTime"
            :format-storage-report-time="formatStorageReportTime"
            :storage-report-reason-label="storageReportReasonLabel"
            :storage-audit-status-class="storageAuditStatusClass"
            :storage-audit-status-label="storageAuditStatusLabel"
            :storage-layer-label="storageLayerLabel"
            :storage-audit-source-label="storageAuditSourceLabel"
            @run-storage-audit="runStorageAudit()"
            @clear-storage-reports="clearStorageReports"
            @repair-storage-drift="repairStorageDrift"
            @run-simulation-tick="runSimulationTickDiagnostic"
            @open-network-reports="openNetworkReports('storage')"
            @open-network-storage-errors="openNetworkReports('storage', 'error')"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.settings-shell {
  position: relative;
  isolation: isolate;
  background: var(--system-page-bg);
  color: var(--system-text);
}

.settings-header {
  border-bottom: 1px solid var(--system-border);
  background: var(--system-chrome-bg);
  box-shadow: var(--system-shadow-chrome);
  backdrop-filter: blur(var(--system-blur-lg)) saturate(1.14);
  -webkit-backdrop-filter: blur(var(--system-blur-lg)) saturate(1.14);
}

.settings-header h1 {
  font-size: 22px;
  line-height: 1.15;
  letter-spacing: 0;
}

.settings-nav-button,
.settings-subpage-back {
  min-height: 36px;
  color: var(--system-accent);
  -webkit-tap-highlight-color: transparent;
}

.settings-scroll,
.settings-subpage-scroll {
  padding-bottom: calc(24px + env(safe-area-inset-bottom));
}

.settings-profile-card,
.settings-group,
.settings-tip-card,
.settings-subpage-scroll :deep(.bg-white.rounded-2xl) {
  border: 1px solid var(--system-card-border);
  background: var(--system-panel-bg);
  box-shadow: var(--system-shadow-card);
}

.settings-profile-card {
  min-height: 88px;
  border-radius: var(--system-radius-lg);
  transition:
    transform var(--system-motion-fast),
    background var(--system-motion-fast),
    box-shadow var(--system-motion-fast);
  -webkit-tap-highlight-color: transparent;
}

.settings-profile-card:active {
  transform: scale(0.992);
  background: var(--system-elevated-bg);
  box-shadow: var(--system-shadow-control);
}

.settings-profile-avatar {
  border: 2px solid var(--system-card-border);
  box-shadow: var(--system-shadow-control);
}

.settings-tip-card {
  border-color: var(--system-control-border);
  background: var(--system-accent-soft);
  box-shadow: none;
}

.settings-section-label {
  color: var(--system-text-soft);
  font-weight: 700;
  letter-spacing: 0;
}

.settings-group {
  border-radius: var(--system-radius-lg);
  overflow: hidden;
}

.settings-inline-panel,
.settings-action-row {
  border-color: var(--system-subtle-border);
}

.settings-status-strip {
  border-color: var(--system-subtle-border);
  background: var(--system-surface-muted);
}

.settings-segment-button {
  min-height: 38px;
  -webkit-tap-highlight-color: transparent;
}

.settings-action-row {
  min-height: 64px;
  -webkit-tap-highlight-color: transparent;
}

.settings-action-row:active {
  background: var(--system-pressed-bg);
}

.settings-action-row:disabled {
  opacity: 0.58;
}

.settings-action-icon {
  width: 34px;
  height: 34px;
  border-radius: 13px;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.26);
}

.settings-subpage {
  background: var(--system-page-bg);
  color: var(--system-text);
}

.settings-subpage-header {
  min-height: 86px;
  border-bottom: 1px solid var(--system-border);
  background: var(--system-chrome-bg);
  box-shadow: var(--system-shadow-chrome);
  backdrop-filter: blur(var(--system-blur-lg)) saturate(1.14);
  -webkit-backdrop-filter: blur(var(--system-blur-lg)) saturate(1.14);
}

.settings-subpage-header span {
  color: var(--system-text);
  font-size: 15px;
  letter-spacing: 0;
}

.settings-subpage-scroll :deep(input[type='text']),
.settings-subpage-scroll :deep(input[type='number']),
.settings-subpage-scroll :deep(input[type='time']),
.settings-subpage-scroll :deep(select) {
  min-height: 42px;
  border-color: var(--system-control-border);
  border-radius: 12px;
  background: var(--system-control-bg);
  color: var(--system-text);
}

.settings-subpage-scroll :deep(button) {
  -webkit-tap-highlight-color: transparent;
}

.settings-shell :deep(.bg-white) {
  background-color: var(--system-panel-bg);
}

.settings-shell :deep(.bg-gray-50),
.settings-shell :deep(.bg-gray-100),
.settings-shell :deep(.bg-gray-200),
.settings-shell :deep(.bg-gray-300) {
  background-color: var(--system-surface-muted);
}

.settings-shell :deep(.bg-blue-50),
.settings-shell :deep(.bg-blue-100) {
  background-color: var(--system-accent-soft);
}

.settings-shell :deep(.bg-green-100),
.settings-shell :deep(.bg-emerald-100) {
  background-color: var(--system-success-soft);
}

.settings-shell :deep(.bg-red-50),
.settings-shell :deep(.bg-red-100) {
  background-color: var(--system-danger-soft);
}

.settings-shell :deep(.bg-amber-50),
.settings-shell :deep(.bg-amber-100),
.settings-shell :deep(.bg-yellow-50),
.settings-shell :deep(.bg-yellow-100) {
  background-color: var(--system-warning-soft);
}

.settings-shell :deep(.text-black),
.settings-shell :deep(.text-gray-700),
.settings-shell :deep(.text-gray-800),
.settings-shell :deep(.text-gray-900) {
  color: var(--system-text);
}

.settings-shell :deep(.text-gray-300),
.settings-shell :deep(.text-gray-400) {
  color: var(--system-text-soft);
}

.settings-shell :deep(.text-gray-500),
.settings-shell :deep(.text-gray-600) {
  color: var(--system-text-muted);
}

.settings-shell :deep(.text-blue-500),
.settings-shell :deep(.text-blue-600),
.settings-shell :deep(.text-blue-700),
.settings-shell :deep(.text-blue-700\/90) {
  color: var(--system-accent);
}

.settings-shell :deep(.text-green-600),
.settings-shell :deep(.text-green-700),
.settings-shell :deep(.text-emerald-600),
.settings-shell :deep(.text-emerald-700) {
  color: var(--system-success);
}

.settings-shell :deep(.text-red-500),
.settings-shell :deep(.text-red-600),
.settings-shell :deep(.text-red-700) {
  color: var(--system-danger);
}

.settings-shell :deep(.text-amber-600),
.settings-shell :deep(.text-amber-700),
.settings-shell :deep(.text-yellow-700) {
  color: var(--system-warning);
}

.settings-shell :deep(.border-gray-100),
.settings-shell :deep(.border-gray-200),
.settings-shell :deep(.border-blue-100),
.settings-shell :deep(.border-blue-200),
.settings-shell :deep(.border-blue-300),
.settings-shell :deep(.border-blue-500),
.settings-shell :deep(.border-emerald-300),
.settings-shell :deep(.border-amber-200),
.settings-shell :deep(.border-red-200) {
  border-color: var(--system-control-border);
}

.settings-shell :deep(input),
.settings-shell :deep(textarea),
.settings-shell :deep(select) {
  color: var(--system-text);
  background-color: var(--system-control-bg);
  border-color: var(--system-control-border);
}

.settings-shell :deep(input:focus),
.settings-shell :deep(textarea:focus),
.settings-shell :deep(select:focus) {
  background-color: var(--system-control-bg-strong);
  box-shadow: 0 0 0 4px var(--system-focus-ring);
}

.settings-shell :deep(.bg-blue-500),
.settings-shell :deep(.bg-blue-600),
.settings-shell :deep(.bg-gray-800),
.settings-shell :deep(.bg-gray-900) {
  color: var(--system-on-accent);
  background-color: var(--system-accent);
}

.settings-shell :deep(.bg-green-500) {
  color: var(--system-on-success);
  background-color: var(--system-success);
}

.settings-shell :deep(.bg-red-500) {
  color: var(--system-on-danger);
  background-color: var(--system-danger);
}

.settings-shell :deep(.bg-yellow-500) {
  color: var(--system-on-warning);
  background-color: var(--system-warning);
}

.settings-shell :deep(.hover\:bg-gray-50:hover),
.settings-shell :deep(.active\:bg-gray-50:active),
.settings-shell :deep(.hover\:bg-blue-50:hover),
.settings-shell :deep(.hover\:bg-blue-600:hover),
.settings-shell :deep(.hover\:bg-black:hover) {
  background-color: var(--system-pressed-bg);
}

@media (prefers-reduced-motion: reduce) {
  .settings-profile-card {
    transition: none;
  }
}
</style>
