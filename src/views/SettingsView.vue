<script setup>
import { computed, onBeforeUnmount, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute, useRouter } from 'vue-router'
import { useSystemStore } from '../stores/system'
import { useChatStore } from '../stores/chat'
import { useCalendarStore } from '../stores/calendar'
import { useMapStore } from '../stores/map'
import { useGalleryStore } from '../stores/gallery'
import { useFilesStore } from '../stores/files'
import { usePhoneStore } from '../stores/phone'
import { useStockStore } from '../stores/stock'
import { useWalletStore } from '../stores/wallet'
import { useDialog } from '../composables/useDialog'
import { useI18n } from '../composables/useI18n'
import SettingsAutomationSection from '../components/settings/SettingsAutomationSection.vue'
import SettingsBackupSection from '../components/settings/SettingsBackupSection.vue'
import SettingsMenuItem from '../components/settings/SettingsMenuItem.vue'
import SettingsPushSection from '../components/settings/SettingsPushSection.vue'
import SettingsQuickAccessButton from '../components/settings/SettingsQuickAccessButton.vue'
import SettingsStorageDiagnosticsSection from '../components/settings/SettingsStorageDiagnosticsSection.vue'
import {
  getPersistenceCapabilities,
  inspectPersistedStateLayers,
  reconcilePersistedStateLayers,
} from '../lib/persistence'
import {
  checkPushServerHealth,
  isWebPushSupported,
  normalizePushDisplayMode,
  normalizePushServerUrl,
  readPushPermission,
  sendTestPush,
  subscribeWebPush,
  syncExistingWebPushSubscription,
  unsubscribeWebPush,
} from '../lib/push'

const router = useRouter()
const route = useRoute()
const systemStore = useSystemStore()
const chatStore = useChatStore()
const calendarStore = useCalendarStore()
const mapStore = useMapStore()
const galleryStore = useGalleryStore()
const filesStore = useFilesStore()
const phoneStore = usePhoneStore()
const stockStore = useStockStore()
const walletStore = useWalletStore()
const { t } = useI18n()
const { confirmDialog } = useDialog()

const { settings, user, notifications, apiReports, truthState } = storeToRefs(systemStore)
const { roleProfiles, contacts, chatHistory, conversations, messagesByConversation } = storeToRefs(chatStore)

const activeMenu = ref('')
const generalSaved = ref(false)
const notificationSaved = ref(false)
const automationSaved = ref(false)
const backupExporting = ref(false)
const backupImporting = ref(false)
const backupFileInput = ref(null)
const backupFeedbackType = ref('')
const backupFeedbackMessage = ref('')
const backupIncludeAssetPackage = ref(false)
const pushActionRunning = ref(false)
const pushHealthRunning = ref(false)
const pushFeedbackType = ref('')
const pushFeedbackMessage = ref('')
const pushServerHealthState = ref('idle')
const pushServerHealthMessage = ref('')
const pushLastHealthCheckAt = ref(0)
let generalSavedTimerId = null
let notificationSavedTimerId = null
let automationSavedTimerId = null
let backupFeedbackTimerId = null
let storageAuditFeedbackTimerId = null
let pushFeedbackTimerId = null
const automationInitialMaster = ref(false)
const persistenceCapabilities = computed(() => getPersistenceCapabilities())
const persistenceCapabilityLabel = (available) =>
  available ? t('可用', 'Available') : t('不可用', 'Unavailable')
const STORAGE_AUDIT_TARGETS = Object.freeze([
  { key: 'store:system', version: 1, labelZh: '系统存档', labelEn: 'System state' },
  { key: 'store:chat', version: 2, labelZh: '聊天存档', labelEn: 'Chat state' },
  { key: 'store:map', version: 2, labelZh: '地图存档', labelEn: 'Map state' },
  { key: 'store:calendar', version: 1, labelZh: '日历存档', labelEn: 'Calendar state' },
  { key: 'store:gallery', version: 1, labelZh: '素材存档', labelEn: 'Gallery state' },
  { key: 'store:files', version: 1, labelZh: '文件索引', labelEn: 'Files index' },
  { key: 'store:wallet', version: 1, labelZh: '钱包账本', labelEn: 'Wallet ledger' },
  { key: 'store:phone', version: 1, labelZh: '电话记录', labelEn: 'Phone logs' },
  { key: 'store:stock', version: 1, labelZh: '模拟行情', labelEn: 'Simulated market' },
])
const storageAuditRunning = ref(false)
const storageRepairRunning = ref(false)
const storageAuditResults = ref([])
const storageAuditAt = ref(0)
const storageAuditFeedbackType = ref('')
const storageAuditFeedbackMessage = ref('')
const backupReminderIntervalOptions = [1, 3, 6, 12, 24, 48, 72, 168, 336, 720]
const BACKUP_SCHEMA_VERSION = 2
const BACKUP_ASSET_PACKAGE_MAX_BYTES = 20 * 1024 * 1024
const BACKUP_ASSET_PACKAGE_MAX_ITEMS = 120
const BACKUP_COPY_TONE_DIRECT = 'direct'
const BACKUP_COPY_TONE_IMMERSIVE = 'immersive'
const backupReminderIntervalLabel = (hours) => {
  const normalizedHours = Number(hours)
  if (!Number.isFinite(normalizedHours) || normalizedHours <= 0) return t('自定义', 'Custom')
  if (normalizedHours % 24 === 0) {
    const days = normalizedHours / 24
    return t(`${days} 天`, `${days} day(s)`)
  }
  return t(`${normalizedHours} 小时`, `${normalizedHours} hour(s)`)
}

const setPushFeedback = (type, message, durationMs = 2200) => {
  pushFeedbackType.value = type
  pushFeedbackMessage.value = message
  if (pushFeedbackTimerId) clearTimeout(pushFeedbackTimerId)
  pushFeedbackTimerId = setTimeout(() => {
    pushFeedbackType.value = ''
    pushFeedbackMessage.value = ''
  }, durationMs)
}

const setBackupFeedback = (type, message, durationMs = 1800) => {
  backupFeedbackType.value = type
  backupFeedbackMessage.value = message
  if (backupFeedbackTimerId) clearTimeout(backupFeedbackTimerId)
  backupFeedbackTimerId = setTimeout(() => {
    backupFeedbackType.value = ''
    backupFeedbackMessage.value = ''
  }, durationMs)
}

const formatBytes = (bytes = 0) => {
  const normalized = Number(bytes)
  if (!Number.isFinite(normalized) || normalized <= 0) return '0 B'
  if (normalized < 1024) return `${Math.round(normalized)} B`
  if (normalized < 1024 * 1024) return `${(normalized / 1024).toFixed(1)} KB`
  return `${(normalized / (1024 * 1024)).toFixed(2)} MB`
}

const backupCopyTone = computed(() =>
  settings.value.system?.backupCopyTone === BACKUP_COPY_TONE_IMMERSIVE
    ? BACKUP_COPY_TONE_IMMERSIVE
    : BACKUP_COPY_TONE_DIRECT,
)

const useImmersiveBackupCopy = computed(
  () => backupCopyTone.value === BACKUP_COPY_TONE_IMMERSIVE,
)

const resolveBackupCopy = (directZh, directEn, immersiveZh, immersiveEn) =>
  useImmersiveBackupCopy.value
    ? t(immersiveZh, immersiveEn)
    : t(directZh, directEn)

const backupExportModeLabel = computed(() =>
  backupIncludeAssetPackage.value
    ? resolveBackupCopy(
        '导出模式：元数据 + 素材包',
        'Export mode: metadata + asset package',
        '导出模式：完整行李（元数据 + 素材包）',
        'Export mode: full luggage (metadata + asset package)',
      )
    : resolveBackupCopy(
        '导出模式：仅元数据（推荐）',
        'Export mode: metadata only (recommended)',
        '导出模式：轻装出行（仅元数据，推荐）',
        'Export mode: travel-light (metadata only, recommended)',
      ),
)

const backupExportModeHint = computed(() =>
  backupIncludeAssetPackage.value
    ? resolveBackupCopy(
        '会尝试打包本地文件素材二进制；URL 素材仍以元数据形式记录。',
        'Will try to package local file-asset binaries; URL assets remain metadata entries.',
        '会尽量把本地素材一起装箱；URL 素材仍只记录来源信息。',
        'Local assets are packed when possible; URL assets still keep source metadata only.',
      )
    : resolveBackupCopy(
        '包含设置、角色档案、会话、世界书等核心数据，文件更小更快。',
        'Includes settings, role profiles, chats, worldbook and other core metadata with smaller file size.',
        '会保存角色、会话和世界书等关键记忆，体积更轻、恢复更快。',
        'Keeps core memories (profiles, chats, worldbook) with a lighter and faster backup.',
      ),
)

const backupPackageLimitHint = computed(() =>
  resolveBackupCopy(
    `素材包上限：最多 ${BACKUP_ASSET_PACKAGE_MAX_ITEMS} 项，约 ${formatBytes(BACKUP_ASSET_PACKAGE_MAX_BYTES)}。`,
    `Asset package limits: up to ${BACKUP_ASSET_PACKAGE_MAX_ITEMS} item(s), about ${formatBytes(BACKUP_ASSET_PACKAGE_MAX_BYTES)}.`,
    `行李舱上限：最多 ${BACKUP_ASSET_PACKAGE_MAX_ITEMS} 项，约 ${formatBytes(BACKUP_ASSET_PACKAGE_MAX_BYTES)}。`,
    `Luggage cap: up to ${BACKUP_ASSET_PACKAGE_MAX_ITEMS} item(s), about ${formatBytes(BACKUP_ASSET_PACKAGE_MAX_BYTES)}.`,
  ),
)

const buildBackupPackageSummaryMessage = (packageSummary) => {
  if (!packageSummary || packageSummary.requested !== true) {
    return resolveBackupCopy(
      ' 当前为元数据备份模式。',
      ' Metadata-only backup mode is used.',
      ' 当前按轻装模式备份（仅元数据）。',
      ' Backup used travel-light mode (metadata only).',
    )
  }

  const itemCount = Math.max(0, Number(packageSummary.itemCount || 0))
  const totalBytes = Math.max(0, Number(packageSummary.totalBytes || 0))
  const skippedCount = Math.max(0, Number(packageSummary.skippedCount || 0))
  const missingCount = Math.max(0, Number(packageSummary.missingCount || 0))
  const overflow = Boolean(packageSummary.overflow)
  const details = []

  if (skippedCount > 0) {
    details.push(
      resolveBackupCopy(
        `超限跳过 ${skippedCount} 项`,
        `${skippedCount} skipped by limits`,
        `超出上限未装箱 ${skippedCount} 项`,
        `${skippedCount} left unpacked by limits`,
      ),
    )
  }
  if (missingCount > 0) {
    details.push(
      resolveBackupCopy(
        `缺失二进制 ${missingCount} 项`,
        `${missingCount} missing binaries`,
        `缺少本地文件 ${missingCount} 项`,
        `${missingCount} local binaries missing`,
      ),
    )
  }
  if (overflow) {
    details.push(
      resolveBackupCopy(
        '已触发体积或数量上限',
        'size/item limit reached',
        '已触发行李舱容量上限',
        'luggage capacity limit reached',
      ),
    )
  }

  const base = resolveBackupCopy(
    ` 素材包：${itemCount} 项，约 ${formatBytes(totalBytes)}。`,
    ` Asset package: ${itemCount} item(s), about ${formatBytes(totalBytes)}.`,
    ` 素材行李：${itemCount} 项，约 ${formatBytes(totalBytes)}。`,
    ` Asset luggage: ${itemCount} item(s), about ${formatBytes(totalBytes)}.`,
  )
  if (details.length === 0) return base
  return `${base}${resolveBackupCopy(' 注意：', ' Note: ', ' 留意：', ' Heads up: ')}${details.join(', ')}。`
}

const backupExportStartedMessage = computed(() =>
  resolveBackupCopy(
    '备份文件下载已开始。',
    'Backup download has started.',
    '备份列车已发车，文件开始下载。',
    'Backup train departed; download has started.',
  ),
)

const setStorageAuditFeedback = (type, message, durationMs = 2200) => {
  storageAuditFeedbackType.value = type
  storageAuditFeedbackMessage.value = message
  if (storageAuditFeedbackTimerId) clearTimeout(storageAuditFeedbackTimerId)
  storageAuditFeedbackTimerId = setTimeout(() => {
    storageAuditFeedbackType.value = ''
    storageAuditFeedbackMessage.value = ''
  }, durationMs)
}

const writeStorageAuditReport = ({
  level = 'info',
  action = 'audit_storage',
  code = '',
  message = '',
  statusCode = 0,
  model = '',
}) => {
  systemStore.addApiReport({
    level,
    module: 'storage',
    action,
    provider: 'local_persistence',
    model,
    statusCode,
    code,
    message,
    createdAt: Date.now(),
  })
}

const clearStorageReports = async () => {
  const ok = await confirmDialog({
    title: t('清理存储报告', 'Clear storage reports'),
    message: t(
      '确认清理所有存储报告吗？此操作不会影响实际存档数据。',
      'Clear all storage reports? This will not affect actual saved data.',
    ),
    confirmText: t('清理', 'Clear'),
    cancelText: t('取消', 'Cancel'),
    tone: 'danger',
  })
  if (!ok) return

  const removed = systemStore.clearApiReports({ module: 'storage' })
  if (removed > 0) {
    setStorageAuditFeedback(
      'success',
      t(`已清理 ${removed} 条存储报告。`, `Cleared ${removed} storage report(s).`),
    )
    return
  }
  setStorageAuditFeedback(
    'warn',
    t('暂无可清理的存储报告。', 'No storage reports to clear.'),
  )
}

const storageLayerLabel = (layerResult, disabledLabel) => {
  if (!layerResult) return t('未知', 'Unknown')
  if (layerResult.decodedOk) return t('有效', 'Valid')
  if (layerResult.exists) return t('异常', 'Invalid')
  return disabledLabel
}

const storageAuditStatusLabel = (result) => {
  if (!result?.mirrorApplicable) return t('仅本地', 'Local only')
  if (result.mirrorInSync) return t('已同步', 'Synced')
  return t('待修复', 'Needs repair')
}

const storageAuditStatusClass = (result) => {
  if (!result?.mirrorApplicable) return 'text-gray-500 bg-gray-100'
  if (result.mirrorInSync) return 'text-green-600 bg-green-100'
  return 'text-amber-700 bg-amber-100'
}

const storageAuditSourceLabel = (source) => {
  if (source === 'local') return t('本地层', 'Local layer')
  if (source === 'indexeddb') return 'IndexedDB'
  return t('无可用来源', 'No valid source')
}

const formatStorageAuditTime = (timestamp) => {
  const ts = Number(timestamp)
  if (!Number.isFinite(ts) || ts <= 0) return t('尚未检查', 'Not checked yet')
  const locale = (settings.value.system?.language || '').toLowerCase().startsWith('zh')
    ? 'zh-CN'
    : settings.value.system?.language || 'en-US'
  try {
    return new Date(ts).toLocaleString(locale)
  } catch {
    return new Date(ts).toLocaleString()
  }
}

const latestStorageReport = computed(() => {
  const list = Array.isArray(apiReports.value) ? apiReports.value : []
  return list.find((item) => item?.module === 'storage') || null
})

const storageReportErrorCount = computed(() => {
  const list = Array.isArray(apiReports.value) ? apiReports.value : []
  return list.filter((item) => item?.module === 'storage' && item?.level === 'error').length
})

const storageReportReasonLabel = (report) => {
  const code = (report?.code || '').toUpperCase()
  if (code === 'STORAGE_HEALTHY') return t('存储状态健康', 'Storage is healthy')
  if (code === 'STORAGE_MIRROR_DRIFT') return t('存储层不同步', 'Storage mirror drift detected')
  if (code === 'STORAGE_LAYER_INVALID') return t('存储层数据异常', 'Invalid payload in storage layer')
  if (code === 'STORAGE_REPAIR_DONE') return t('存储修复完成', 'Storage repair completed')
  if (code === 'STORAGE_REPAIR_NOOP') return t('无需修复', 'No repair needed')
  if (code === 'STORAGE_REPAIR_PARTIAL') return t('存储修复部分失败', 'Storage repair partially failed')
  if (code === 'BACKUP_EXPORT_METADATA_ONLY')
    return t('备份导出成功（元数据）', 'Backup export succeeded (metadata)')
  if (code === 'BACKUP_EXPORT_WITH_ASSET_PACKAGE')
    return t('备份导出成功（含素材包）', 'Backup export succeeded (with asset package)')
  if (code === 'BACKUP_EXPORT_WITH_ASSET_PACKAGE_PARTIAL')
    return t('备份导出完成（素材包部分缺失）', 'Backup export completed (asset package partial)')
  if (code === 'BACKUP_EXPORT_FAILED')
    return t('备份导出失败', 'Backup export failed')
  if (code === 'BACKUP_IMPORT_METADATA_ONLY')
    return t('备份导入成功（元数据）', 'Backup import succeeded (metadata)')
  if (code === 'BACKUP_IMPORT_WITH_ASSET_PACKAGE')
    return t('备份导入成功（含素材包）', 'Backup import succeeded (with asset package)')
  if (code === 'BACKUP_IMPORT_ASSET_PACKAGE_PARTIAL')
    return t('备份导入部分成功（素材包有失败）', 'Backup import partially succeeded (asset package failures)')
  if (code === 'BACKUP_IMPORT_INVALID_JSON')
    return t('备份导入失败（JSON 无效）', 'Backup import failed (invalid JSON)')
  if (code === 'BACKUP_IMPORT_INVALID_FORMAT')
    return t('备份导入失败（文件格式无效）', 'Backup import failed (invalid file format)')
  if (code === 'BACKUP_IMPORT_UNSUPPORTED_SCHEMA')
    return t('备份导入失败（版本过高）', 'Backup import failed (unsupported schema)')
  if (code === 'BACKUP_IMPORT_STRUCTURE_UNSUPPORTED')
    return t('备份导入失败（结构不支持）', 'Backup import failed (unsupported structure)')
  if (code === 'BACKUP_IMPORT_FAILED')
    return t('备份导入失败', 'Backup import failed')
  return t('无存储报告', 'No storage report')
}

const formatStorageReportTime = (timestamp) => {
  const ts = Number(timestamp)
  if (!Number.isFinite(ts) || ts <= 0) return t('尚无记录', 'No records yet')
  const locale = (settings.value.system?.language || '').toLowerCase().startsWith('zh')
    ? 'zh-CN'
    : settings.value.system?.language || 'en-US'
  try {
    return new Date(ts).toLocaleString(locale)
  } catch {
    return new Date(ts).toLocaleString()
  }
}

const runStorageAudit = async ({ silent = false, record = !silent } = {}) => {
  if (storageAuditRunning.value) return
  storageAuditRunning.value = true
  try {
    const reports = await Promise.all(
      STORAGE_AUDIT_TARGETS.map(async (target) => {
        const inspection = await inspectPersistedStateLayers(target.key, {
          version: target.version,
        })
        return {
          ...target,
          ...inspection,
        }
      }),
    )
    storageAuditResults.value = reports
    storageAuditAt.value = Date.now()

    const driftCount = reports.filter(
      (item) => item.mirrorApplicable && !item.mirrorInSync,
    ).length
    const invalidCount = reports.filter(
      (item) =>
        (item.local?.exists && !item.local?.decodedOk) ||
        (item.mirrorApplicable && item.indexeddb?.exists && !item.indexeddb?.decodedOk),
    ).length

    if (record) {
      writeStorageAuditReport({
        level: driftCount > 0 || invalidCount > 0 ? 'error' : 'info',
        action: 'audit_storage',
        code:
          invalidCount > 0
            ? 'STORAGE_LAYER_INVALID'
            : driftCount > 0
              ? 'STORAGE_MIRROR_DRIFT'
              : 'STORAGE_HEALTHY',
        message:
          driftCount > 0 || invalidCount > 0
            ? t(
                `存储检查完成：不同步 ${driftCount} 项，异常 ${invalidCount} 项。`,
                `Storage audit completed: drift ${driftCount}, invalid ${invalidCount}.`,
              )
            : t(
                '存储检查完成：各层数据一致且可读。',
                'Storage audit completed: layers are aligned and readable.',
              ),
        model: reports
          .map((item) =>
            item.mirrorApplicable && !item.mirrorInSync ? item.key : '',
          )
          .filter(Boolean)
          .join(','),
      })
    }

    if (!silent) {
      if (driftCount > 0) {
        setStorageAuditFeedback(
          'warn',
          t(
            `检查完成：发现 ${driftCount} 项存储不同步，可执行修复。`,
            `Check completed: ${driftCount} storage item(s) are out of sync and can be repaired.`,
          ),
        )
      } else {
        setStorageAuditFeedback(
          'success',
          t('检查完成：存储状态正常。', 'Check completed: storage state is healthy.'),
        )
      }
    }
  } finally {
    storageAuditRunning.value = false
  }
}

const repairStorageDrift = async () => {
  if (storageRepairRunning.value || storageAuditRunning.value) return
  storageRepairRunning.value = true
  try {
    const targets = storageAuditResults.value.length > 0
      ? storageAuditResults.value
      : STORAGE_AUDIT_TARGETS

    let repairCount = 0
    let failedCount = 0
    for (const target of targets) {
      const report = await reconcilePersistedStateLayers(target.key, {
        version: target.version,
        strategy: 'newest_valid',
      })
      if (report.action === 'repaired') {
        repairCount += 1
      } else if (report.ok === false) {
        failedCount += 1
      }
    }

    await runStorageAudit({ silent: true, record: false })

    writeStorageAuditReport({
      level: failedCount > 0 ? 'error' : 'info',
      action: 'repair_storage',
      code:
        failedCount > 0
          ? 'STORAGE_REPAIR_PARTIAL'
          : repairCount > 0
            ? 'STORAGE_REPAIR_DONE'
            : 'STORAGE_REPAIR_NOOP',
      message:
        failedCount > 0
          ? t(
              `存储修复完成：成功 ${repairCount} 项，失败 ${failedCount} 项。`,
              `Storage repair finished: ${repairCount} succeeded, ${failedCount} failed.`,
            )
          : repairCount > 0
            ? t(
                `存储修复完成：已修复 ${repairCount} 项不同步。`,
                `Storage repair finished: ${repairCount} drift item(s) fixed.`,
              )
            : t(
                '存储修复完成：未发现需要修复的项目。',
                'Storage repair finished: no drift needed to be fixed.',
              ),
      model: targets.map((target) => target.key).join(','),
    })

    if (failedCount > 0) {
      setStorageAuditFeedback(
        'warn',
        t(
          `修复完成：成功 ${repairCount} 项，失败 ${failedCount} 项。`,
          `Repair finished: ${repairCount} succeeded, ${failedCount} failed.`,
        ),
      )
      return
    }

    setStorageAuditFeedback(
      'success',
      t(
        `修复完成：已处理 ${repairCount} 项存储差异。`,
        `Repair finished: ${repairCount} storage drift item(s) processed.`,
      ),
    )
  } finally {
    storageRepairRunning.value = false
  }
}

const goHome = () => {
  router.push('/home')
}

const webPushSupported = computed(() => isWebPushSupported())
const normalizedPushServerUrl = computed(() =>
  normalizePushServerUrl(settings.value.system?.pushServerUrl, ''),
)
const pushPermissionLabel = computed(() => {
  const permission = settings.value.system?.pushPermission || 'default'
  if (permission === 'granted') return t('已授权', 'Granted')
  if (permission === 'denied') return t('已拒绝', 'Denied')
  if (permission === 'unsupported') return t('当前环境不支持', 'Unsupported here')
  return t('未决定', 'Default')
})
const pushSubscriptionLabel = computed(() =>
  settings.value.system?.pushSubscriptionActive
    ? t('已连接', 'Connected')
    : t('未连接', 'Not connected'),
)
const pushServerHealthLabel = computed(() => {
  if (pushServerHealthState.value === 'ok') return t('服务可达', 'Reachable')
  if (pushServerHealthState.value === 'error') return t('服务不可达', 'Unreachable')
  return t('尚未检查', 'Not checked')
})
const pushCapabilityHint = computed(() =>
  webPushSupported.value
    ? t(
        '当前浏览器支持系统推送；在手机上建议安装到主屏幕后再开启。',
        'This browser supports system push; on mobile, install to home screen before enabling.',
      )
    : t(
        '当前环境不满足真推送条件，需要 HTTPS 或 localhost，并且浏览器支持 Service Worker / Push。',
        'True push needs HTTPS or localhost plus browser support for Service Worker and Push.',
      ),
)
const pushDisplayModeHint = computed(() => {
  const mode = normalizePushDisplayMode(settings.value.system?.pushDisplayMode, 'minimal')
  if (mode === 'preview') {
    return t(
      '预览：外部系统通知会尽量显示消息正文预览，最接近聊天软件提醒。',
      'Preview: external system notifications try to show message preview text, closest to chat app behavior.',
    )
  }
  if (mode === 'standard') {
    return t(
      '标准：外部系统通知仍显示 SchatPhone，但会区分聊天、地图等模块类型，不直接暴露正文。',
      'Standard: external system notifications still show SchatPhone, but distinguish chat/map module types without exposing message text.',
    )
  }
  return t(
    '极简：外部系统通知仅提示 SchatPhone 有新提醒，最克制也最隐私。',
    'Minimal: external system notifications only say SchatPhone has a new reminder, the most private option.',
  )
})

const normalizeSettingsMenuFromQuery = (value) => {
  const raw = typeof value === 'string' ? value.trim() : ''
  const allowed = new Set(['general', 'notification', 'automation', 'about'])
  return allowed.has(raw) ? raw : ''
}

const openSubPage = (menu) => {
  activeMenu.value = menu
  if (menu === 'automation') {
    automationInitialMaster.value = Boolean(settings.value.aiAutomation?.masterEnabled)
  }
  if (menu === 'notification') {
    systemStore.syncPushPermissionFromBrowser()
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
  router.push('/profile')
}

const openWorldBook = () => {
  router.push('/worldbook')
}

const saveGeneralSettings = () => {
  const rawInterval = Number(settings.value.system.backupReminderIntervalHours)
  settings.value.system.backupReminderIntervalHours = Number.isFinite(rawInterval)
    ? Math.min(24 * 30, Math.max(1, Math.floor(rawInterval)))
    : 24
  settings.value.system.backupReminderEnabled = settings.value.system.backupReminderEnabled !== false
  systemStore.saveNow()
  generalSaved.value = true
  if (generalSavedTimerId) clearTimeout(generalSavedTimerId)
  generalSavedTimerId = setTimeout(() => {
    generalSaved.value = false
  }, 1200)
}

const saveNotificationSettings = () => {
  settings.value.system.pushDisplayMode = normalizePushDisplayMode(
    settings.value.system.pushDisplayMode,
    'minimal',
  )
  settings.value.system.pushServerUrl = normalizePushServerUrl(
    settings.value.system.pushServerUrl,
    settings.value.system.pushServerUrl || '',
  )
  systemStore.syncPushPermissionFromBrowser()
  systemStore.saveNow()
  notificationSaved.value = true
  if (notificationSavedTimerId) clearTimeout(notificationSavedTimerId)
  notificationSavedTimerId = setTimeout(() => {
    notificationSaved.value = false
  }, 1200)
}

const updateNotificationEnabled = (enabled) => {
  settings.value.system.notifications = Boolean(enabled)
}

const updateRealPushEnabled = (enabled) => {
  settings.value.system.realPushEnabled = Boolean(enabled)
}

const updatePushDisplayMode = (mode) => {
  settings.value.system.pushDisplayMode = mode
}

const updatePushServerUrl = (url) => {
  settings.value.system.pushServerUrl = url
}

const checkPushServerHealthNow = async ({ silent = false } = {}) => {
  const serverUrl = normalizePushServerUrl(settings.value.system.pushServerUrl, '')
  if (!serverUrl) {
    pushServerHealthState.value = 'error'
    pushServerHealthMessage.value = t(
      '请先填写 Push Server 地址。',
      'Enter a Push Server URL first.',
    )
    pushLastHealthCheckAt.value = Date.now()
    if (!silent) {
      setPushFeedback('warn', pushServerHealthMessage.value)
    }
    return
  }

  pushHealthRunning.value = true
  try {
    const result = await checkPushServerHealth({ serverUrl })
    pushLastHealthCheckAt.value = Date.now()
    if (!result.ok) {
      systemStore.setPushState({
        pushLastError: result.message || '',
      })
      systemStore.addApiReport({
        level: 'error',
        module: 'push',
        action: 'health_check',
        code: result.reason || 'health_check_failed',
        message: result.message || t('Push Server 不可达。', 'Push Server is unreachable.'),
      })
      pushServerHealthState.value = 'error'
      pushServerHealthMessage.value =
        result.message || t('Push Server 不可达。', 'Push Server is unreachable.')
      if (!silent) {
        setPushFeedback('warn', pushServerHealthMessage.value)
      }
      return
    }

    pushServerHealthState.value = 'ok'
    systemStore.setPushState({
      pushServerUrl: result.serverUrl,
      pushLastError: '',
    })
    if (!silent) {
      systemStore.addApiReport({
        level: 'info',
        module: 'push',
        action: 'health_check',
        message: t('Push Server 健康检查通过。', 'Push Server health check passed.'),
      })
    }
    pushServerHealthMessage.value = t(
      `Push Server 已连通，当前记录 ${result.subscriptionCount} 条订阅、${result.scheduledCount} 条计划任务。`,
      `Push Server reachable with ${result.subscriptionCount} subscription(s) and ${result.scheduledCount} scheduled job(s).`,
    )
    if (!silent) {
      setPushFeedback('success', pushServerHealthMessage.value)
    }
  } finally {
    pushHealthRunning.value = false
  }
}

const resyncRealPushNow = async ({ silent = false } = {}) => {
  const serverUrl = normalizePushServerUrl(settings.value.system.pushServerUrl, '')
  if (!serverUrl) {
    if (!silent) {
      setPushFeedback(
        'warn',
        t('请先填写 Push Server 地址。', 'Enter a Push Server URL first.'),
      )
    }
    return
  }

  pushActionRunning.value = true
  try {
    const result = await syncExistingWebPushSubscription({
      serverUrl,
      deviceId: settings.value.system.pushDeviceId || '',
    })

    if (!result.ok) {
      const permission = readPushPermission()
      const hasMissingLocalSubscription = result.reason === 'subscription_missing'
      systemStore.setPushState({
        pushPermission: permission,
        pushSubscriptionActive: hasMissingLocalSubscription ? false : settings.value.system.pushSubscriptionActive,
        pushLastError: result.message || '',
      })
      systemStore.addApiReport({
        level: 'error',
        module: 'push',
        action: 'resync',
        code: result.reason || 'resync_failed',
        message: result.message || t('重同步订阅失败。', 'Failed to resync subscription.'),
      })
      if (!silent) {
        setPushFeedback(
          'warn',
          result.message || t('重同步订阅失败。', 'Failed to resync subscription.'),
        )
      }
      return
    }

    systemStore.setPushState({
      realPushEnabled: true,
      pushServerUrl: result.serverUrl,
      pushDeviceId: result.deviceId,
      pushPermission: readPushPermission(),
      pushSubscriptionActive: true,
      pushLastSyncedAt: Date.now(),
      pushLastError: '',
    })
    if (!silent) {
      systemStore.addApiReport({
        level: 'info',
        module: 'push',
        action: 'resync',
        message: t('浏览器订阅已重新同步。', 'Browser subscription resynced.'),
      })
    }
    if (!silent) {
      setPushFeedback(
        'success',
        t('当前浏览器订阅已重新同步到 Push Server。', 'Current browser subscription has been resynced to Push Server.'),
      )
    }
  } finally {
    pushActionRunning.value = false
  }
}

const subscribeRealPushNow = async () => {
  systemStore.syncPushPermissionFromBrowser()
  if (!webPushSupported.value) {
    setPushFeedback('warn', pushCapabilityHint.value)
    return
  }

  const serverUrl = normalizePushServerUrl(settings.value.system.pushServerUrl, '')
  if (!serverUrl) {
    setPushFeedback(
      'warn',
      t(
        '请先填写可访问的 Push Server 地址，再进行订阅。',
        'Enter a reachable push server URL before subscribing.',
      ),
    )
    return
  }

  pushActionRunning.value = true
  try {
    const result = await subscribeWebPush({
      serverUrl,
      deviceId: settings.value.system.pushDeviceId || '',
    })

    if (!result.ok) {
      systemStore.setPushState({
        pushPermission: readPushPermission(),
        pushLastError: result.message || '',
      })
      systemStore.addApiReport({
        level: 'error',
        module: 'push',
        action: 'subscribe',
        code: result.reason || 'subscribe_failed',
        message: result.message || t('订阅真推送失败。', 'Failed to subscribe real push.'),
      })
      setPushFeedback(
        'warn',
        result.message || t('订阅真推送失败。', 'Failed to subscribe real push.'),
      )
      return
    }

    systemStore.setPushState({
      realPushEnabled: true,
      pushServerUrl: result.serverUrl,
      pushPermission: result.permission,
      pushDeviceId: result.deviceId,
      pushSubscriptionActive: true,
      pushLastSyncedAt: Date.now(),
      pushLastError: '',
      pushVapidPublicKey: result.publicKey,
    })
    systemStore.addApiReport({
      level: 'info',
      module: 'push',
      action: 'subscribe',
      message: t('真推送订阅成功。', 'Real push subscribed successfully.'),
    })
    setPushFeedback(
      'success',
      t('真推送已连接，现在可以发送系统级测试通知。', 'Real push connected. You can send a system-level test now.'),
    )
  } finally {
    pushActionRunning.value = false
  }
}

const unsubscribeRealPushNow = async () => {
  if (!settings.value.system.pushDeviceId && !settings.value.system.pushSubscriptionActive) {
    systemStore.setPushState({
      realPushEnabled: false,
      pushSubscriptionActive: false,
      pushLastError: '',
    })
    setPushFeedback('success', t('真推送已关闭。', 'Real push disabled.'))
    return
  }

  const ok = await confirmDialog({
    title: t('取消真推送', 'Disable real push'),
    message: t(
      '确认取消这台设备的真推送订阅吗？取消后将不再收到系统级推送。',
      'Unsubscribe this device from real push? System notifications will stop.',
    ),
    confirmText: t('取消订阅', 'Unsubscribe'),
    cancelText: t('保留', 'Keep enabled'),
    tone: 'danger',
  })
  if (!ok) return

  pushActionRunning.value = true
  try {
    const result = await unsubscribeWebPush({
      serverUrl: settings.value.system.pushServerUrl,
      deviceId: settings.value.system.pushDeviceId,
    })
    if (!result.ok) {
      systemStore.setPushState({
        pushLastError: result.message || '',
      })
      systemStore.addApiReport({
        level: 'error',
        module: 'push',
        action: 'unsubscribe',
        code: result.reason || 'unsubscribe_failed',
        message: result.message || t('取消真推送失败。', 'Failed to unsubscribe real push.'),
      })
      setPushFeedback(
        'warn',
        result.message || t('取消真推送失败。', 'Failed to unsubscribe real push.'),
      )
      return
    }

    systemStore.setPushState({
      realPushEnabled: false,
      pushPermission: readPushPermission(),
      pushSubscriptionActive: false,
      pushLastSyncedAt: Date.now(),
      pushLastError: '',
      pushVapidPublicKey: '',
    })
    systemStore.addApiReport({
      level: 'info',
      module: 'push',
      action: 'unsubscribe',
      message: t('真推送已取消订阅。', 'Real push unsubscribed.'),
    })
    setPushFeedback('success', t('真推送已取消订阅。', 'Real push unsubscribed.'))
  } finally {
    pushActionRunning.value = false
  }
}

const sendRealPushTestNow = async () => {
  const serverUrl = normalizePushServerUrl(settings.value.system.pushServerUrl, '')
  if (!serverUrl || !settings.value.system.pushDeviceId) {
    setPushFeedback(
      'warn',
      t('请先完成真推送订阅，再发送测试通知。', 'Subscribe real push before sending a test.'),
    )
    return
  }

  pushActionRunning.value = true
  try {
    const result = await sendTestPush({
      serverUrl,
      deviceId: settings.value.system.pushDeviceId,
    })
    if (!result.ok) {
      systemStore.setPushState({
        pushLastError: result.message || '',
      })
      systemStore.addApiReport({
        level: 'error',
        module: 'push',
        action: 'test',
        code: result.reason || 'push_test_failed',
        message: result.message || t('测试推送发送失败。', 'Failed to send test push.'),
      })
      setPushFeedback(
        'warn',
        result.message || t('测试推送发送失败。', 'Failed to send test push.'),
      )
      return
    }

    systemStore.setPushState({
      pushLastSyncedAt: Date.now(),
      pushLastError: '',
    })
    systemStore.addApiReport({
      level: 'info',
      module: 'push',
      action: 'test',
      message: t('测试推送已发送，请查看系统通知。', 'Test push sent. Check system notifications.'),
    })
    setPushFeedback(
      'success',
      t('测试推送已发送，请查看系统通知。', 'Test push sent. Check system notifications.'),
    )
  } finally {
    pushActionRunning.value = false
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

const updateAutomationField = (field, value) => {
  if (!settings.value.aiAutomation) return
  settings.value.aiAutomation[field] = value
}

const updateAutomationModuleEnabled = (moduleKey, enabled) => {
  const moduleSettings = settings.value.aiAutomation?.modules?.[moduleKey]
  if (!moduleSettings) return
  moduleSettings.enabled = Boolean(enabled)
}

const updateAutomationModulePriority = (moduleKey, priority) => {
  const moduleSettings = settings.value.aiAutomation?.modules?.[moduleKey]
  if (!moduleSettings) return
  moduleSettings.priority = priority
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

const openNetworkReports = (moduleKey = 'all', levelKey = 'all') => {
  const normalizedModule = typeof moduleKey === 'string' ? moduleKey.trim() : 'all'
  const normalizedLevel = typeof levelKey === 'string' ? levelKey.trim() : 'all'
  if ((!normalizedModule || normalizedModule === 'all') && (!normalizedLevel || normalizedLevel === 'all')) {
    router.push('/network')
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
    query,
  })
}

const openAppearanceStudio = () => {
  router.push('/appearance')
}

const buildBackupPayload = async () => {
  const includeAssetPackage = backupIncludeAssetPackage.value === true
  const gallerySnapshot = await galleryStore.createBackupSnapshotAsync({
    includeAssetPackage,
    maxPackageBytes: BACKUP_ASSET_PACKAGE_MAX_BYTES,
    maxPackageItems: BACKUP_ASSET_PACKAGE_MAX_ITEMS,
  })
  const packageSummary =
    gallerySnapshot && typeof gallerySnapshot.packageSummary === 'object'
      ? gallerySnapshot.packageSummary
      : {
          requested: includeAssetPackage,
          included: false,
          itemCount: 0,
          totalBytes: 0,
          skippedCount: 0,
          missingCount: 0,
          overflow: false,
          maxPackageBytes: BACKUP_ASSET_PACKAGE_MAX_BYTES,
          maxPackageItems: BACKUP_ASSET_PACKAGE_MAX_ITEMS,
        }

  return {
    backupMeta: {
      schemaVersion: BACKUP_SCHEMA_VERSION,
      exportedAt: Date.now(),
      exportMode: includeAssetPackage ? 'metadata_with_asset_package' : 'metadata_only',
      galleryAssetPackage: packageSummary,
    },
    settings: settings.value,
    user: user.value,
    notifications: notifications.value,
    apiReports: apiReports.value,
    truthState: truthState.value,
    roleProfiles: roleProfiles.value,
    contacts: contacts.value,
    chatHistory: chatHistory.value,
    conversations: conversations.value,
    messagesByConversation: messagesByConversation.value,
    map: {
      ...mapStore.createBackupSnapshot(),
    },
    calendar: {
      ...calendarStore.createBackupSnapshot(),
    },
    gallery: gallerySnapshot,
    files: filesStore.createBackupSnapshot(),
    wallet: walletStore.createBackupSnapshot(),
    phone: phoneStore.createBackupSnapshot(),
    stock: stockStore.createBackupSnapshot(),
  }
}

const createBackupImportError = (code, message) => {
  const error = new Error(message)
  error.code = code
  return error
}

const normalizeBackupSchemaVersion = (payload) => {
  if (!payload || typeof payload !== 'object') return 1
  const rawVersion = Number(payload?.backupMeta?.schemaVersion)
  if (!Number.isFinite(rawVersion) || rawVersion <= 0) return 1
  return Math.max(1, Math.floor(rawVersion))
}

const hasRecognizableBackupSections = (payload) => {
  if (!payload || typeof payload !== 'object') return false
  if (payload.settings && typeof payload.settings === 'object') return true
  if (payload.user && typeof payload.user === 'object') return true
  if (Array.isArray(payload.contacts)) return true
  if (Array.isArray(payload.conversations)) return true
  if (Array.isArray(payload.messagesByConversation)) return true
  if (payload.map && typeof payload.map === 'object') return true
  if (payload.calendar && typeof payload.calendar === 'object') return true
  if (payload.gallery && typeof payload.gallery === 'object') return true
  if (payload.files && typeof payload.files === 'object') return true
  if (payload.wallet && typeof payload.wallet === 'object') return true
  if (payload.phone && typeof payload.phone === 'object') return true
  if (payload.stock && typeof payload.stock === 'object') return true
  if (Array.isArray(payload.assets)) return true
  return false
}

const validateBackupPayload = (payload) => {
  if (!payload || typeof payload !== 'object') {
    return {
      ok: false,
      code: 'BACKUP_IMPORT_INVALID_FORMAT',
      message: t('备份文件格式无效。', 'Invalid backup file format.'),
      schemaVersion: 1,
    }
  }

  const schemaVersion = normalizeBackupSchemaVersion(payload)
  if (schemaVersion > BACKUP_SCHEMA_VERSION) {
    return {
      ok: false,
      code: 'BACKUP_IMPORT_UNSUPPORTED_SCHEMA',
      message: t(
        `备份版本过高（v${schemaVersion}），当前仅支持到 v${BACKUP_SCHEMA_VERSION}。`,
        `Backup schema is newer (v${schemaVersion}); current app supports up to v${BACKUP_SCHEMA_VERSION}.`,
      ),
      schemaVersion,
    }
  }

  if (!hasRecognizableBackupSections(payload)) {
    return {
      ok: false,
      code: 'BACKUP_IMPORT_STRUCTURE_UNSUPPORTED',
      message: t('备份结构不完整或不受支持。', 'Backup structure is incomplete or unsupported.'),
      schemaVersion,
    }
  }

  return {
    ok: true,
    code: '',
    message: '',
    schemaVersion,
  }
}

const resolveBackupImportFailure = (error) => {
  const code = (typeof error?.code === 'string' && error.code.trim()) ? error.code.trim().toUpperCase() : ''
  if (code === 'BACKUP_IMPORT_INVALID_JSON') {
    return {
      code,
      detail: t('备份文件不是有效 JSON。', 'Backup file is not valid JSON.'),
    }
  }
  if (code === 'BACKUP_IMPORT_INVALID_FORMAT') {
    return {
      code,
      detail: t('备份文件格式无效。', 'Invalid backup file format.'),
    }
  }
  if (code === 'BACKUP_IMPORT_UNSUPPORTED_SCHEMA') {
    return {
      code,
      detail:
        typeof error?.message === 'string' && error.message.trim()
          ? error.message.trim()
          : t('备份版本过高，当前版本无法直接导入。', 'Backup schema is newer than this app version.'),
    }
  }
  if (code === 'BACKUP_IMPORT_STRUCTURE_UNSUPPORTED') {
    return {
      code,
      detail: t('备份结构不完整或不受支持。', 'Backup structure is incomplete or unsupported.'),
    }
  }
  return {
    code: code || 'BACKUP_IMPORT_FAILED',
    detail:
      typeof error?.message === 'string' && error.message.trim()
        ? error.message.trim()
        : t('发生未知错误。', 'Unknown error occurred.'),
  }
}

const exportData = async () => {
  if (backupExporting.value) return
  backupExporting.value = true
  try {
    const payload = await buildBackupPayload()
    const data = JSON.stringify(payload)

    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'schatphone_backup.json'
    anchor.click()
    URL.revokeObjectURL(url)
    systemStore.markBackupExported()
    systemStore.saveNow()

    const packageSummary =
      payload?.backupMeta?.galleryAssetPackage && typeof payload.backupMeta.galleryAssetPackage === 'object'
        ? payload.backupMeta.galleryAssetPackage
        : null
    const packageMsg = buildBackupPackageSummaryMessage(packageSummary)
    const packageHasPartial =
      Boolean(packageSummary?.requested) &&
      (Number(packageSummary?.skippedCount || 0) > 0 ||
        Number(packageSummary?.missingCount || 0) > 0 ||
        Boolean(packageSummary?.overflow))
    const reportCode = packageSummary?.requested
      ? packageHasPartial
        ? 'BACKUP_EXPORT_WITH_ASSET_PACKAGE_PARTIAL'
        : 'BACKUP_EXPORT_WITH_ASSET_PACKAGE'
      : 'BACKUP_EXPORT_METADATA_ONLY'
    const message = `${backupExportStartedMessage.value}${packageMsg}`
    setBackupFeedback(packageHasPartial ? 'warn' : 'success', message, 2800)
    writeStorageAuditReport({
      level: packageHasPartial ? 'warn' : 'info',
      action: 'export_backup',
      code: reportCode,
      message,
      model: payload?.backupMeta?.exportMode || '',
    })
  } catch (error) {
    const detail = typeof error?.message === 'string' && error.message.trim() ? ` ${error.message.trim()}` : ''
    const message = `${t('备份导出失败。', 'Backup export failed.')}${detail}`
    setBackupFeedback('error', message, 3200)
    writeStorageAuditReport({
      level: 'error',
      action: 'export_backup',
      code: 'BACKUP_EXPORT_FAILED',
      message,
    })
  } finally {
    backupExporting.value = false
  }
}

const deepClone = (value) => {
  if (typeof structuredClone === 'function') return structuredClone(value)
  return JSON.parse(JSON.stringify(value))
}

const restoreOptionalBackupSection = (store, section) => {
  if (!section || typeof section !== 'object') return true
  return store.restoreFromBackup(section)
}

const createRollbackSnapshot = () => {
  return {
    system: {
      settings: deepClone(settings.value),
      user: deepClone(user.value),
      notifications: deepClone(notifications.value),
      apiReports: deepClone(apiReports.value),
      truthState: deepClone(truthState.value),
    },
    chat: {
      roleProfiles: deepClone(roleProfiles.value),
      contacts: deepClone(contacts.value),
      chatHistory: deepClone(chatHistory.value),
      conversations: deepClone(conversations.value),
      messagesByConversation: deepClone(messagesByConversation.value),
    },
    map: {
      ...deepClone(mapStore.createBackupSnapshot()),
    },
    calendar: {
      ...deepClone(calendarStore.createBackupSnapshot()),
    },
    gallery: galleryStore.createBackupSnapshot(),
    files: filesStore.createBackupSnapshot(),
    wallet: walletStore.createBackupSnapshot(),
    phone: phoneStore.createBackupSnapshot(),
    stock: stockStore.createBackupSnapshot(),
  }
}

const triggerImportData = () => {
  if (backupImporting.value || backupExporting.value) return
  backupFileInput.value?.click()
}

const resetImportInput = (event) => {
  if (!event?.target) return
  event.target.value = ''
}

const importData = async (event) => {
  const file = event?.target?.files?.[0]
  resetImportInput(event)
  if (!file || backupImporting.value || backupExporting.value) return

  const confirmed = await confirmDialog({
    title: t('导入备份', 'Import backup'),
    message: t(
      '导入会覆盖当前本地数据。是否继续？',
      'Import will overwrite current local data. Continue?',
    ),
    confirmText: t('继续导入', 'Continue import'),
    cancelText: t('取消', 'Cancel'),
    tone: 'danger',
  })
  if (!confirmed) return

  backupImporting.value = true
  const rollback = createRollbackSnapshot()

  try {
    const text = await file.text()
    let parsed = null
    try {
      parsed = JSON.parse(text)
    } catch {
      throw createBackupImportError(
        'BACKUP_IMPORT_INVALID_JSON',
        t('备份文件不是有效 JSON。', 'Backup file is not valid JSON.'),
      )
    }

    const preflight = validateBackupPayload(parsed)
    if (!preflight.ok) {
      throw createBackupImportError(preflight.code, preflight.message)
    }

    const systemOk = systemStore.restoreFromBackup(parsed)
    const chatOk = chatStore.restoreFromBackup(parsed)
    const mapOk = mapStore.restoreFromBackup(parsed.map || parsed)
    const calendarOk = calendarStore.restoreFromBackup(parsed.calendar || parsed)
    const galleryRestoreResult = await galleryStore.restoreFromBackupAsync(parsed.gallery || parsed, {
      restoreAssetPackage: true,
    })
    const filesOk = restoreOptionalBackupSection(filesStore, parsed.files)
    const walletOk = restoreOptionalBackupSection(walletStore, parsed.wallet)
    const phoneOk = restoreOptionalBackupSection(phoneStore, parsed.phone)
    const stockOk = restoreOptionalBackupSection(stockStore, parsed.stock)
    if (
      !systemOk ||
      !chatOk ||
      !mapOk ||
      !calendarOk ||
      !galleryRestoreResult?.ok ||
      !filesOk ||
      !walletOk ||
      !phoneOk ||
      !stockOk
    ) {
      throw createBackupImportError(
        'BACKUP_IMPORT_STRUCTURE_UNSUPPORTED',
        t('备份结构不完整或不受支持。', 'Backup structure is incomplete or unsupported.'),
      )
    }

    systemStore.saveNow()
    chatStore.saveNow()
    mapStore.saveNow()
    calendarStore.saveNow()
    galleryStore.saveNow()
    filesStore.saveNow()
    walletStore.saveNow()
    phoneStore.saveNow()
    stockStore.saveNow()

    const restoredCount = Number(galleryRestoreResult.restoredPackageCount || 0)
    const failedCount = Number(galleryRestoreResult.failedPackageCount || 0)
    const skippedCount = Number(galleryRestoreResult.skippedPackageCount || 0)
    const hasPackageSummary = galleryRestoreResult.packageApplied === true
    const suffix = hasPackageSummary
      ? t(
          ` 素材包恢复：成功 ${restoredCount}，失败 ${failedCount}，跳过 ${skippedCount}。`,
          ` Asset package restore: ${restoredCount} succeeded, ${failedCount} failed, ${skippedCount} skipped.`,
        )
      : t(' 该备份不含素材包，仅恢复元数据。', ' This backup has no asset package; metadata only was restored.')
    const message = `${t('导入成功，数据已恢复。', 'Import succeeded and data has been restored.')}${suffix}`
    setBackupFeedback(failedCount > 0 ? 'warn' : 'success', message, 2800)
    writeStorageAuditReport({
      level: failedCount > 0 ? 'error' : 'info',
      action: 'import_backup',
      code:
        failedCount > 0
          ? 'BACKUP_IMPORT_ASSET_PACKAGE_PARTIAL'
          : hasPackageSummary
            ? 'BACKUP_IMPORT_WITH_ASSET_PACKAGE'
            : 'BACKUP_IMPORT_METADATA_ONLY',
      message,
      model: parsed?.backupMeta?.exportMode || '',
    })
  } catch (error) {
    systemStore.restoreFromBackup(rollback.system)
    chatStore.restoreFromBackup(rollback.chat)
    mapStore.restoreFromBackup(rollback.map)
    calendarStore.restoreFromBackup(rollback.calendar)
    galleryStore.restoreFromBackup(rollback.gallery)
    filesStore.restoreFromBackup(rollback.files)
    walletStore.restoreFromBackup(rollback.wallet)
    phoneStore.restoreFromBackup(rollback.phone)
    stockStore.restoreFromBackup(rollback.stock)
    systemStore.saveNow()
    chatStore.saveNow()
    mapStore.saveNow()
    calendarStore.saveNow()
    galleryStore.saveNow()
    filesStore.saveNow()
    walletStore.saveNow()
    phoneStore.saveNow()
    stockStore.saveNow()
    const resolved = resolveBackupImportFailure(error)
    const detail = resolved.detail ? ` ${resolved.detail}` : ''
    const message = `${t('导入失败，已自动回滚。', 'Import failed and rolled back automatically.')}${detail}`
    setBackupFeedback(
      'error',
      message,
      3200,
    )
    writeStorageAuditReport({
      level: 'error',
      action: 'import_backup',
      code: resolved.code || 'BACKUP_IMPORT_FAILED',
      message,
      model: typeof file?.name === 'string' ? file.name : '',
    })
  } finally {
    backupImporting.value = false
  }
}

onBeforeUnmount(() => {
  if (generalSavedTimerId) clearTimeout(generalSavedTimerId)
  if (notificationSavedTimerId) clearTimeout(notificationSavedTimerId)
  if (automationSavedTimerId) clearTimeout(automationSavedTimerId)
  if (backupFeedbackTimerId) clearTimeout(backupFeedbackTimerId)
  if (storageAuditFeedbackTimerId) clearTimeout(storageAuditFeedbackTimerId)
  if (pushFeedbackTimerId) clearTimeout(pushFeedbackTimerId)
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
    systemStore.syncPushPermissionFromBrowser()
  }
  if (initialMenu === 'about') {
    void runStorageAudit({ silent: true })
  }
}
</script>

<template>
  <div class="w-full h-full bg-[#f2f2f7] flex flex-col text-black">
    <div class="pt-12 pb-4 px-4 bg-white/80 backdrop-blur sticky top-0 z-10 border-b border-gray-200 flex items-center">
      <button @click="goHome" class="mr-2 text-blue-500 flex items-center gap-1 text-sm font-medium">
        <i class="fas fa-chevron-left"></i> {{ t('主页', 'Home') }}
      </button>
      <h1 class="text-2xl font-bold flex-1">{{ t('设置', 'Settings') }}</h1>
    </div>

    <div class="flex-1 overflow-y-auto p-4 space-y-5 no-scrollbar">
      <button class="w-full bg-white rounded-2xl p-4 flex items-center gap-4 shadow-sm text-left" @click="openProfile">
        <div class="w-14 h-14 rounded-full bg-gray-300 overflow-hidden">
          <img
            :src="user.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + user.name"
            class="w-full h-full object-cover"
          />
        </div>
        <div class="flex-1">
          <h2 class="text-lg font-semibold">{{ user.name || t('未命名用户', 'Unnamed User') }}</h2>
          <p class="text-xs text-gray-500">{{ t('Apple ID、头像与基础人设', 'Apple ID, avatar and profile basics') }}</p>
        </div>
        <i class="fas fa-chevron-right text-gray-300"></i>
      </button>

      <div class="bg-blue-50 border border-blue-100 rounded-2xl p-3.5">
        <p class="text-[11px] font-semibold text-blue-700">{{ t('新手建议', 'Beginner tip') }}</p>
        <p class="text-[11px] text-blue-700/90 mt-1">
          {{
            t(
              '推荐顺序：先配置“网络与 API”，再进入会话手动触发回复，最后按需要开启自动响应。',
              'Recommended flow: set up Network & API first, then use manual trigger in chat, and enable automation only when needed.',
            )
          }}
        </p>
      </div>

      <div class="px-1 text-[11px] text-gray-500 font-medium">{{ t('快捷入口', 'Quick Access') }}</div>
      <div class="grid grid-cols-3 gap-2">
        <SettingsQuickAccessButton
          title-zh="网络与 API"
          title-en="Network & API"
          subtitle-zh="配置接口"
          subtitle-en="Configure provider"
          @select="openNetworkReports"
        />
        <SettingsQuickAccessButton
          title-zh="会话设置"
          title-en="Chat settings"
          subtitle-zh="角色与会话"
          subtitle-en="Roles and threads"
          @select="openChatAutomation"
        />
        <SettingsQuickAccessButton
          title-zh="外观工坊"
          title-en="Appearance"
          subtitle-zh="主题与壁纸"
          subtitle-en="Theme and wallpaper"
          @select="openAppearanceStudio"
        />
      </div>

      <div class="px-1 text-[11px] text-gray-500 font-medium">{{ t('内容设置', 'Content Settings') }}</div>
      <div class="bg-white rounded-2xl overflow-hidden shadow-sm">
        <SettingsMenuItem
          title-zh="世界书"
          title-en="World Book"
          subtitle-zh="所有对话共享的世界设定"
          subtitle-en="Shared context for all chats"
          icon="fas fa-book-open"
          icon-class="bg-purple-500"
          @select="openWorldBook"
        />
        <SettingsMenuItem
          title-zh="通用"
          title-en="General"
          subtitle-zh="系统语言、时区等基础项"
          subtitle-en="Language, timezone and basic system options"
          icon="fas fa-sliders"
          icon-class="bg-gray-600"
          @select="openSubPage('general')"
        />
        <SettingsMenuItem
          title-zh="AI 自动响应"
          title-en="AI Automation"
          subtitle-zh="总开关、优先级、安静时段"
          subtitle-en="Master switch, priorities and quiet hours"
          icon="fas fa-robot"
          icon-class="bg-indigo-500"
          @select="openSubPage('automation')"
        />
        <SettingsMenuItem
          title-zh="通知"
          title-en="Notifications"
          subtitle-zh="消息提醒与系统提示"
          subtitle-en="Message alerts and system notifications"
          icon="fas fa-bell"
          icon-class="bg-red-500"
          :with-border="false"
          @select="openSubPage('notification')"
        />
      </div>

      <div class="px-1 text-[11px] text-gray-500 font-medium">{{ t('数据与安全', 'Data & Security') }}</div>
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
        @update-backup-copy-tone="settings.system.backupCopyTone = $event"
        @update-include-asset-package="backupIncludeAssetPackage = $event"
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

      <div v-if="activeMenu === 'general'" class="fixed inset-0 bg-[#f2f2f7] z-20 flex flex-col animate-slide-in">
        <div class="pt-12 pb-2 px-2 bg-white flex items-center border-b">
          <button @click="closeSubPage" class="text-blue-500 flex items-center px-2">
            <i class="fas fa-chevron-left mr-1"></i> {{ t('设置', 'Settings') }}
          </button>
          <span class="font-bold mx-auto pr-8">{{ t('通用', 'General') }}</span>
        </div>

        <div class="p-4 space-y-4 overflow-y-auto no-scrollbar">
          <div class="bg-white rounded-2xl p-4">
            <label class="text-xs text-gray-500 block mb-2">{{ t('语言', 'Language') }}</label>
            <select v-model="settings.system.language" class="w-full border rounded-lg px-2 py-2 text-sm outline-none bg-white">
              <option value="zh-CN">简体中文</option>
              <option value="en-US">{{ t('英语', 'English') }}</option>
              <option value="ko-KR">한국어</option>
            </select>
          </div>

          <div class="bg-white rounded-2xl p-4">
            <label class="text-xs text-gray-500 block mb-1">{{ t('时区', 'Timezone') }}</label>
            <input
              v-model="settings.system.timezone"
              type="text"
              class="w-full border-b border-gray-200 py-1 outline-none text-sm"
              placeholder="Asia/Shanghai"
            />
          </div>

          <div class="bg-white rounded-2xl p-4 space-y-3">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-semibold">{{ t('备份提醒', 'Backup Reminder') }}</p>
                <p class="text-[10px] text-gray-500">
                  {{ t('通过系统通知提醒你定期导出备份，不使用弹窗。', 'Uses system-style notifications to remind regular backup export, no pop-up dialogs.') }}
                </p>
              </div>
              <input v-model="settings.system.backupReminderEnabled" type="checkbox" class="w-5 h-5" />
            </div>

            <div v-if="settings.system.backupReminderEnabled" class="space-y-2">
              <label class="text-xs text-gray-500 block mb-1">{{ t('提醒间隔', 'Reminder interval') }}</label>
              <select
                v-model.number="settings.system.backupReminderIntervalHours"
                class="w-full border rounded-lg px-2 py-2 text-sm outline-none bg-white"
              >
                <option
                  v-for="hours in backupReminderIntervalOptions"
                  :key="hours"
                  :value="hours"
                >
                  {{ backupReminderIntervalLabel(hours) }}
                </option>
              </select>
              <p class="text-[10px] text-gray-400">
                {{ t('建议至少 24 小时一次。', 'Recommended: at least once every 24 hours.') }}
              </p>
            </div>
          </div>

          <button
            @click="saveGeneralSettings"
            class="w-full py-3 rounded-xl text-sm font-semibold transition"
            :class="generalSaved ? 'bg-green-500 text-white' : 'bg-blue-500 text-white hover:bg-blue-600'"
          >
            {{ generalSaved ? t('已保存', 'Saved') : t('保存通用设置', 'Save general settings') }}
          </button>
        </div>
      </div>

      <div v-if="activeMenu === 'automation'" class="fixed inset-0 bg-[#f2f2f7] z-20 flex flex-col animate-slide-in">
        <div class="pt-12 pb-2 px-2 bg-white flex items-center border-b">
          <button @click="closeSubPage" class="text-blue-500 flex items-center px-2">
            <i class="fas fa-chevron-left mr-1"></i> {{ t('设置', 'Settings') }}
          </button>
          <span class="font-bold mx-auto pr-8">{{ t('AI 自动响应', 'AI Automation') }}</span>
        </div>

        <div class="p-4 space-y-4 overflow-y-auto no-scrollbar">
          <SettingsAutomationSection
            :ai-automation="settings.aiAutomation"
            :automation-runtime-policy="automationRuntimePolicy"
            :automation-saved="automationSaved"
            @update-automation-field="updateAutomationField"
            @update-module-enabled="updateAutomationModuleEnabled"
            @update-module-priority="updateAutomationModulePriority"
            @open-chat-automation="openChatAutomation"
            @open-network-reports="openNetworkReports"
            @save-automation-settings="saveAutomationSettings"
          />
        </div>
      </div>

      <div v-if="activeMenu === 'notification'" class="fixed inset-0 bg-[#f2f2f7] z-20 flex flex-col animate-slide-in">
        <div class="pt-12 pb-2 px-2 bg-white flex items-center border-b">
          <button @click="closeSubPage" class="text-blue-500 flex items-center px-2">
            <i class="fas fa-chevron-left mr-1"></i> {{ t('设置', 'Settings') }}
          </button>
          <span class="font-bold mx-auto pr-8">{{ t('通知', 'Notifications') }}</span>
        </div>

        <div class="p-4 space-y-4 overflow-y-auto no-scrollbar">
          <SettingsPushSection
            :settings="settings"
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
            :format-storage-report-time="formatStorageReportTime"
            @update-notifications="updateNotificationEnabled"
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

      <div v-if="activeMenu === 'about'" class="fixed inset-0 bg-[#f2f2f7] z-20 flex flex-col animate-slide-in">
        <div class="pt-12 pb-2 px-2 bg-white flex items-center border-b">
          <button @click="closeSubPage" class="text-blue-500 flex items-center px-2">
            <i class="fas fa-chevron-left mr-1"></i> {{ t('设置', 'Settings') }}
          </button>
          <span class="font-bold mx-auto pr-8">{{ t('关于', 'About') }}</span>
        </div>

        <div class="p-4 space-y-4 overflow-y-auto no-scrollbar">
          <div class="bg-white rounded-2xl p-4">
            <p class="text-sm font-semibold">SchatPhone</p>
            <p class="text-xs text-gray-500 mt-1">{{ t('当前版本：1.2.0', 'Current version: 1.2.0') }}</p>
            <p class="text-xs text-gray-500 mt-1">{{ t('框架：Vue 3 + Vite + Pinia + Tailwind v4', 'Stack: Vue 3 + Vite + Pinia + Tailwind v4') }}</p>
          </div>

          <SettingsStorageDiagnosticsSection
            :persistence-capabilities="persistenceCapabilities"
            :storage-audit-running="storageAuditRunning"
            :storage-repair-running="storageRepairRunning"
            :storage-audit-at="storageAuditAt"
            :storage-audit-feedback-type="storageAuditFeedbackType"
            :storage-audit-feedback-message="storageAuditFeedbackMessage"
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
            @open-network-reports="openNetworkReports('storage')"
            @open-network-storage-errors="openNetworkReports('storage', 'error')"
          />
        </div>
      </div>
    </div>
  </div>
</template>
