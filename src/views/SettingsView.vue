<script setup>
import { computed, onBeforeUnmount, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute, useRouter } from 'vue-router'
import { useSystemStore } from '../stores/system'
import { useChatStore } from '../stores/chat'
import { useMapStore } from '../stores/map'
import { useGalleryStore } from '../stores/gallery'
import { useI18n } from '../composables/useI18n'
import {
  getPersistenceCapabilities,
  inspectPersistedStateLayers,
  reconcilePersistedStateLayers,
} from '../lib/persistence'

const router = useRouter()
const route = useRoute()
const systemStore = useSystemStore()
const chatStore = useChatStore()
const mapStore = useMapStore()
const galleryStore = useGalleryStore()
const { t } = useI18n()

const { settings, user, notifications, apiReports, truthState } = storeToRefs(systemStore)
const { roleProfiles, contacts, chatHistory, conversations, messagesByConversation } = storeToRefs(chatStore)
const { addresses, currentLocation, tripForm } = storeToRefs(mapStore)

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
let generalSavedTimerId = null
let notificationSavedTimerId = null
let automationSavedTimerId = null
let backupFeedbackTimerId = null
let storageAuditFeedbackTimerId = null
const automationInitialMaster = ref(false)
const persistenceCapabilities = computed(() => getPersistenceCapabilities())
const persistenceCapabilityLabel = (available) =>
  available ? t('可用', 'Available') : t('不可用', 'Unavailable')
const STORAGE_AUDIT_TARGETS = Object.freeze([
  { key: 'store:system', version: 1, labelZh: '系统存档', labelEn: 'System state' },
  { key: 'store:chat', version: 2, labelZh: '聊天存档', labelEn: 'Chat state' },
  { key: 'store:map', version: 1, labelZh: '地图存档', labelEn: 'Map state' },
  { key: 'store:gallery', version: 1, labelZh: '素材存档', labelEn: 'Gallery state' },
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

const clearStorageReports = () => {
  const ok = window.confirm(
    t(
      '确认清理所有存储报告吗？此操作不会影响实际存档数据。',
      'Clear all storage reports? This will not affect actual saved data.',
    ),
  )
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
  systemStore.saveNow()
  notificationSaved.value = true
  if (notificationSavedTimerId) clearTimeout(notificationSavedTimerId)
  notificationSavedTimerId = setTimeout(() => {
    notificationSaved.value = false
  }, 1200)
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

const saveAutomationSettings = () => {
  if (!settings.value.aiAutomation) return

  if (!automationInitialMaster.value && settings.value.aiAutomation.masterEnabled) {
    const ok = window.confirm(
      t(
        '开启后会允许系统按配置自主触发 AI 调用，可能消耗 API 供应商额度。确认继续？',
        'Enabling this allows autonomous AI calls by configuration and may consume provider quota. Continue?',
      ),
    )
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
      addresses: addresses.value,
      currentLocation: currentLocation.value,
      tripForm: tripForm.value,
    },
    gallery: gallerySnapshot,
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
  if (payload.gallery && typeof payload.gallery === 'object') return true
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
      addresses: deepClone(addresses.value),
      currentLocation: deepClone(currentLocation.value),
      tripForm: deepClone(tripForm.value),
    },
    gallery: galleryStore.createBackupSnapshot(),
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

  const confirmed = window.confirm(
    t(
      '导入会覆盖当前本地数据。是否继续？',
      'Import will overwrite current local data. Continue?',
    ),
  )
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
    const galleryRestoreResult = await galleryStore.restoreFromBackupAsync(parsed.gallery || parsed, {
      restoreAssetPackage: true,
    })
    if (!systemOk || !chatOk || !mapOk || !galleryRestoreResult?.ok) {
      throw createBackupImportError(
        'BACKUP_IMPORT_STRUCTURE_UNSUPPORTED',
        t('备份结构不完整或不受支持。', 'Backup structure is incomplete or unsupported.'),
      )
    }

    systemStore.saveNow()
    chatStore.saveNow()
    mapStore.saveNow()
    galleryStore.saveNow()

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
    galleryStore.restoreFromBackup(rollback.gallery)
    systemStore.saveNow()
    chatStore.saveNow()
    mapStore.saveNow()
    galleryStore.saveNow()
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
})

const initialMenu = normalizeSettingsMenuFromQuery(
  typeof route.query?.menu === 'string' ? route.query.menu : '',
)
if (initialMenu) {
  activeMenu.value = initialMenu
  if (initialMenu === 'automation') {
    automationInitialMaster.value = Boolean(settings.value.aiAutomation?.masterEnabled)
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
        <button
          class="bg-white rounded-xl p-2.5 border border-gray-100 text-left active:bg-gray-50"
          @click="openNetworkReports"
        >
          <p class="text-[11px] font-semibold text-gray-800">{{ t('网络与 API', 'Network & API') }}</p>
          <p class="text-[10px] text-gray-500 mt-0.5">{{ t('配置接口', 'Configure provider') }}</p>
        </button>
        <button
          class="bg-white rounded-xl p-2.5 border border-gray-100 text-left active:bg-gray-50"
          @click="openChatAutomation"
        >
          <p class="text-[11px] font-semibold text-gray-800">{{ t('会话设置', 'Chat settings') }}</p>
          <p class="text-[10px] text-gray-500 mt-0.5">{{ t('角色与会话', 'Roles and threads') }}</p>
        </button>
        <button
          class="bg-white rounded-xl p-2.5 border border-gray-100 text-left active:bg-gray-50"
          @click="openAppearanceStudio"
        >
          <p class="text-[11px] font-semibold text-gray-800">{{ t('外观工坊', 'Appearance') }}</p>
          <p class="text-[10px] text-gray-500 mt-0.5">{{ t('主题与壁纸', 'Theme and wallpaper') }}</p>
        </button>
      </div>

      <div class="px-1 text-[11px] text-gray-500 font-medium">{{ t('内容设置', 'Content Settings') }}</div>
      <div class="bg-white rounded-2xl overflow-hidden shadow-sm">
        <button
          class="w-full p-3.5 flex items-center gap-3 border-b border-gray-100 active:bg-gray-50 transition text-left"
          @click="openWorldBook"
        >
          <div class="w-7 h-7 rounded-lg bg-purple-500 flex items-center justify-center text-white text-xs">
            <i class="fas fa-book-open"></i>
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm">{{ t('世界书', 'World Book') }}</p>
            <p class="text-[11px] text-gray-500">{{ t('所有对话共享的世界设定', 'Shared context for all chats') }}</p>
          </div>
          <i class="fas fa-chevron-right text-gray-300 text-xs"></i>
        </button>

        <button
          class="w-full p-3.5 flex items-center gap-3 border-b border-gray-100 active:bg-gray-50 transition text-left"
          @click="openSubPage('general')"
        >
          <div class="w-7 h-7 rounded-lg bg-gray-600 flex items-center justify-center text-white text-xs">
            <i class="fas fa-sliders"></i>
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm">{{ t('通用', 'General') }}</p>
            <p class="text-[11px] text-gray-500">{{ t('系统语言、时区等基础项', 'Language, timezone and basic system options') }}</p>
          </div>
          <i class="fas fa-chevron-right text-gray-300 text-xs"></i>
        </button>

        <button
          class="w-full p-3.5 flex items-center gap-3 border-b border-gray-100 active:bg-gray-50 transition text-left"
          @click="openSubPage('automation')"
        >
          <div class="w-7 h-7 rounded-lg bg-indigo-500 flex items-center justify-center text-white text-xs">
            <i class="fas fa-robot"></i>
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm">{{ t('AI 自动响应', 'AI Automation') }}</p>
            <p class="text-[11px] text-gray-500">{{ t('总开关、优先级、安静时段', 'Master switch, priorities and quiet hours') }}</p>
          </div>
          <i class="fas fa-chevron-right text-gray-300 text-xs"></i>
        </button>

        <button
          class="w-full p-3.5 flex items-center gap-3 active:bg-gray-50 transition text-left"
          @click="openSubPage('notification')"
        >
          <div class="w-7 h-7 rounded-lg bg-red-500 flex items-center justify-center text-white text-xs">
            <i class="fas fa-bell"></i>
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm">{{ t('通知', 'Notifications') }}</p>
            <p class="text-[11px] text-gray-500">{{ t('消息提醒与系统提示', 'Message alerts and system notifications') }}</p>
          </div>
          <i class="fas fa-chevron-right text-gray-300 text-xs"></i>
        </button>
      </div>

      <div class="px-1 text-[11px] text-gray-500 font-medium">{{ t('数据与安全', 'Data & Security') }}</div>
      <div class="bg-white rounded-2xl overflow-hidden shadow-sm">
        <div class="px-3.5 py-3 border-b border-gray-100 space-y-2.5">
          <p class="text-sm font-medium">{{ t('备份提示风格', 'Backup copy style') }}</p>
          <div class="grid grid-cols-2 gap-2">
            <button
              class="py-2 rounded-lg text-xs font-medium border transition"
              :class="
                backupCopyTone === 'direct'
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              "
              @click="settings.system.backupCopyTone = 'direct'"
            >
              {{ t('直白说明', 'Direct') }}
            </button>
            <button
              class="py-2 rounded-lg text-xs font-medium border transition"
              :class="
                backupCopyTone === 'immersive'
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              "
              @click="settings.system.backupCopyTone = 'immersive'"
            >
              {{ t('沉浸叙事', 'Immersive') }}
            </button>
          </div>
          <p class="text-[11px] text-gray-500">
            {{
              t(
                '仅影响系统提示文案，不影响 AI 回复内容。',
                'Only affects system copy, not AI-generated replies.',
              )
            }}
          </p>
        </div>

        <div class="px-3.5 py-3 border-b border-gray-100">
          <div class="flex items-center justify-between gap-3">
            <div class="min-w-0">
              <p class="text-sm font-medium">{{ resolveBackupCopy('导出包含素材包（可选）', 'Include asset package in export (optional)', '导出时附带素材行李（可选）', 'Include asset luggage in export (optional)') }}</p>
              <p class="text-[11px] text-gray-500">
                {{
                  resolveBackupCopy(
                    '默认仅导出元数据。开启后会尝试打包本地素材二进制，文件体积会明显增大。',
                    'Metadata-only is default. When enabled, local binary assets are packaged and backup size grows significantly.',
                    '默认轻装模式仅导出元数据。开启后会尽量装入本地素材，备份体积会明显变大。',
                    'Travel-light (metadata-only) is default. Enabling this packs local assets when possible and increases backup size.',
                  )
                }}
              </p>
            </div>
            <input
              v-model="backupIncludeAssetPackage"
              type="checkbox"
              class="w-5 h-5 shrink-0"
              :disabled="backupExporting || backupImporting"
            />
          </div>
        </div>

        <div class="px-3.5 py-2.5 border-b border-gray-100 bg-gray-50 space-y-1">
          <p class="text-[11px] font-medium text-gray-700">{{ backupExportModeLabel }}</p>
          <p class="text-[10px] text-gray-500">{{ backupExportModeHint }}</p>
          <p class="text-[10px] text-gray-400">{{ backupPackageLimitHint }}</p>
        </div>

        <button
          class="w-full p-3.5 flex items-center gap-3 border-b border-gray-100 active:bg-gray-50 transition text-left"
          @click="exportData"
          :disabled="backupExporting || backupImporting"
        >
          <div class="w-7 h-7 rounded bg-yellow-500 flex items-center justify-center text-white text-xs">
            <i class="fas fa-file-export"></i>
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm">
              {{
                backupExporting
                  ? t('正在导出...', 'Exporting...')
                  : resolveBackupCopy('备份与导出（JSON）', 'Backup & Export (JSON)', '打包并导出（JSON）', 'Pack & Export (JSON)')
              }}
            </p>
            <p class="text-[11px] text-gray-500">
              {{
                backupIncludeAssetPackage
                  ? resolveBackupCopy(
                      '将尝试附带素材包导出（体积更大）',
                      'Will try to include asset package (larger file size)',
                      '将尝试附带素材行李导出（文件更大）',
                      'Will try to include asset luggage (larger file size)',
                    )
                  : resolveBackupCopy(
                      '导出当前本地数据快照（元数据模式）',
                      'Export current local snapshot (metadata mode)',
                      '导出当前本地快照（轻装模式）',
                      'Export current local snapshot (travel-light mode)',
                    )
              }}
            </p>
          </div>
          <i class="fas fa-chevron-right text-gray-300 text-xs"></i>
        </button>

        <button
          class="w-full p-3.5 flex items-center gap-3 border-b border-gray-100 active:bg-gray-50 transition text-left"
          @click="triggerImportData"
          :disabled="backupImporting || backupExporting"
        >
          <div class="w-7 h-7 rounded bg-green-500 flex items-center justify-center text-white text-xs">
            <i class="fas fa-file-import"></i>
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm">
              {{ backupImporting ? t('正在导入...', 'Importing...') : t('恢复导入（JSON）', 'Restore Import (JSON)') }}
            </p>
            <p class="text-[11px] text-gray-500">{{ t('导入失败会自动回滚', 'Auto rollback will run if import fails') }}</p>
          </div>
          <i class="fas fa-chevron-right text-gray-300 text-xs"></i>
        </button>

        <button
          class="w-full p-3.5 flex items-center gap-3 active:bg-gray-50 transition text-left"
          @click="openSubPage('about')"
        >
          <div class="w-7 h-7 rounded bg-blue-500 flex items-center justify-center text-white text-xs">
            <i class="fas fa-circle-info"></i>
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm">{{ t('关于 SchatPhone', 'About SchatPhone') }}</p>
            <p class="text-[11px] text-gray-500">{{ t('版本与框架信息', 'Version and stack information') }}</p>
          </div>
          <i class="fas fa-chevron-right text-gray-300 text-xs"></i>
        </button>
      </div>
      <input
        ref="backupFileInput"
        type="file"
        accept="application/json"
        class="hidden"
        @change="importData"
      />

      <p
        v-if="backupFeedbackMessage"
        class="px-1 text-[11px]"
        :class="backupFeedbackType === 'error' ? 'text-red-600' : backupFeedbackType === 'warn' ? 'text-amber-600' : 'text-emerald-600'"
      >
        {{ backupFeedbackMessage }}
      </p>

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
          <div class="bg-white rounded-2xl p-4 space-y-3">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-semibold">{{ t('全局自主调用总开关', 'Global autonomous switch') }}</p>
                <p class="text-[10px] text-gray-400">
                  {{ t('关闭后所有模块与会话的自主调用都失效。', 'When off, all autonomous calls in modules and chats are disabled.') }}
                </p>
              </div>
              <input v-model="settings.aiAutomation.masterEnabled" type="checkbox" class="w-5 h-5" />
            </div>
          </div>

          <div class="bg-white rounded-2xl p-4 space-y-3">
            <p class="text-sm font-semibold">{{ t('模块级开关与优先级', 'Module switches and priorities') }}</p>
            <div class="grid grid-cols-[1fr,70px,70px] gap-2 items-center">
              <p class="text-xs text-gray-500">{{ t('模块', 'Module') }}</p>
              <p class="text-xs text-gray-500 text-center">{{ t('开启', 'Enable') }}</p>
              <p class="text-xs text-gray-500 text-center">{{ t('优先级', 'Priority') }}</p>

              <p class="text-sm">{{ t('聊天（Chat）', 'Chat') }}</p>
              <div class="text-center">
                <input v-model="settings.aiAutomation.modules.chat.enabled" type="checkbox" class="w-4 h-4" />
              </div>
              <input v-model.number="settings.aiAutomation.modules.chat.priority" type="number" min="1" max="1000" class="border rounded px-2 py-1 text-xs text-right" />

              <p class="text-sm">{{ t('地图（Map，预留）', 'Map (Reserved)') }}</p>
              <div class="text-center">
                <input v-model="settings.aiAutomation.modules.map.enabled" type="checkbox" class="w-4 h-4" />
              </div>
              <input v-model.number="settings.aiAutomation.modules.map.priority" type="number" min="1" max="1000" class="border rounded px-2 py-1 text-xs text-right" />

              <p class="text-sm">{{ t('购物（预留）', 'Shopping (Reserved)') }}</p>
              <div class="text-center">
                <input v-model="settings.aiAutomation.modules.shopping.enabled" type="checkbox" class="w-4 h-4" />
              </div>
              <input v-model.number="settings.aiAutomation.modules.shopping.priority" type="number" min="1" max="1000" class="border rounded px-2 py-1 text-xs text-right" />
            </div>
          </div>

          <div class="bg-white rounded-2xl p-4 space-y-3">
            <p class="text-sm font-semibold">{{ t('执行模式与安静时段', 'Execution mode and quiet hours') }}</p>
            <label class="flex items-center justify-between gap-2">
              <span class="text-xs text-gray-500">{{ t('仅通知模式（不自动生成回复）', 'Notify-only mode (no auto reply generation)') }}</span>
              <input v-model="settings.aiAutomation.notifyOnlyMode" type="checkbox" class="w-4 h-4" />
            </label>
            <label class="flex items-center justify-between gap-2">
              <span class="text-xs text-gray-500">{{ t('启用安静时段（自动转为仅通知）', 'Enable quiet hours (force notify-only)') }}</span>
              <input v-model="settings.aiAutomation.quietHoursEnabled" type="checkbox" class="w-4 h-4" />
            </label>
            <div v-if="settings.aiAutomation.quietHoursEnabled" class="grid grid-cols-2 gap-2">
              <label class="flex flex-col gap-1">
                <span class="text-[11px] text-gray-500">{{ t('开始', 'Start') }}</span>
                <input
                  v-model="settings.aiAutomation.quietHoursStart"
                  type="time"
                  class="border rounded px-2 py-1.5 text-xs"
                />
              </label>
              <label class="flex flex-col gap-1">
                <span class="text-[11px] text-gray-500">{{ t('结束', 'End') }}</span>
                <input
                  v-model="settings.aiAutomation.quietHoursEnd"
                  type="time"
                  class="border rounded px-2 py-1.5 text-xs"
                />
              </label>
            </div>
            <p class="text-[11px] text-gray-500">
              {{
                t(
                  '当前运行态：',
                  'Current runtime mode:',
                )
              }}
              {{
                automationRuntimePolicy.notifyOnly
                  ? automationRuntimePolicy.quietHoursActive
                    ? t('安静时段仅通知', 'Quiet-hours notify-only')
                    : t('全局仅通知', 'Global notify-only')
                  : t('允许自动调用', 'Autonomous invoke enabled')
              }}
            </p>
          </div>

          <div class="bg-white rounded-2xl p-4 space-y-3">
            <p class="text-sm font-semibold">{{ t('冲突与防重复策略', 'Conflict and dedupe policy') }}</p>
            <label class="flex items-center justify-between gap-2">
              <span class="text-xs text-gray-500">{{ t('手动触发后冷却秒数', 'Cooldown after manual trigger (sec)') }}</span>
              <input
                v-model.number="settings.aiAutomation.conflictCooldownSec"
                type="number"
                min="10"
                max="600"
                class="w-24 border rounded px-2 py-1 text-xs text-right"
              />
            </label>
            <label class="flex items-center justify-between gap-2">
              <span class="text-xs text-gray-500">{{ t('重复上下文抑制秒数', 'Dedupe window (sec)') }}</span>
              <input
                v-model.number="settings.aiAutomation.dedupeWindowSec"
                type="number"
                min="10"
                max="1800"
                class="w-24 border rounded px-2 py-1 text-xs text-right"
              />
            </label>
          </div>

          <div class="bg-white rounded-2xl p-4">
            <p class="text-xs text-gray-500">
              {{ t('每个角色的自主调用间隔（如 360 秒/720 秒）在对应 Chat 会话菜单中设置。', 'Per-role autonomous interval (e.g. 360s/720s) is configured in each Chat thread menu.') }}
            </p>
            <button @click="openChatAutomation" class="mt-2 px-3 py-2 rounded-lg border border-gray-200 text-sm hover:bg-gray-50">
              {{ t('前往会话设置', 'Go to chat settings') }}
            </button>
          </div>

          <div class="bg-white rounded-2xl p-4 space-y-2">
            <p class="text-xs text-gray-500">
              {{
                t(
                  '手动触发始终优先；若与定时自主调用接近重叠，系统会自动顺延本轮自主调用，避免重复回复。',
                  'Manual triggers always take priority. If near overlap happens with timed auto invoke, this cycle is deferred to avoid duplicate replies.',
                )
              }}
            </p>
            <p class="text-xs text-gray-500">
              {{
                t(
                  '调用失败与中断记录可在 Network 的诊断报告中心查看。',
                  'Failure and cancellation logs are available in Network diagnostics center.',
                )
              }}
            </p>
            <button @click="openNetworkReports" class="px-3 py-2 rounded-lg border border-gray-200 text-sm hover:bg-gray-50">
              {{ t('前往诊断记录', 'Go to diagnostics') }}
            </button>
          </div>

          <button
            @click="saveAutomationSettings"
            class="w-full py-3 rounded-xl text-sm font-semibold transition"
            :class="automationSaved ? 'bg-green-500 text-white' : 'bg-blue-500 text-white hover:bg-blue-600'"
          >
            {{ automationSaved ? t('已保存', 'Saved') : t('保存自动响应设置', 'Save automation settings') }}
          </button>
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
          <div class="bg-white rounded-2xl p-4 flex items-center justify-between">
            <div>
              <p class="text-sm">{{ t('消息通知', 'Message notifications') }}</p>
              <p class="text-[10px] text-gray-400">{{ t('用于聊天消息与系统提醒', 'Used for chat messages and system alerts') }}</p>
            </div>
            <input v-model="settings.system.notifications" type="checkbox" class="w-5 h-5" />
          </div>

          <button
            @click="saveNotificationSettings"
            class="w-full py-3 rounded-xl text-sm font-semibold transition"
            :class="notificationSaved ? 'bg-green-500 text-white' : 'bg-blue-500 text-white hover:bg-blue-600'"
          >
            {{ notificationSaved ? t('已保存', 'Saved') : t('保存通知设置', 'Save notification settings') }}
          </button>
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

          <div class="bg-white rounded-2xl p-4">
            <p class="text-sm font-semibold">{{ t('本地存储能力', 'Local Storage Capability') }}</p>
            <p class="text-xs text-gray-500 mt-1">
              localStorage: {{ persistenceCapabilityLabel(persistenceCapabilities.localStorageAvailable) }}
            </p>
            <p class="text-xs text-gray-500 mt-1">
              IndexedDB: {{ persistenceCapabilityLabel(persistenceCapabilities.indexedDbAvailable) }}
            </p>
            <p class="text-xs text-gray-500 mt-1">
              {{ t('镜像模式', 'Mirror mode') }}: {{ persistenceCapabilityLabel(persistenceCapabilities.indexedDbMirrorEnabled) }}
            </p>
            <p class="text-[10px] text-gray-400 mt-2">
              {{ t('命名空间', 'Namespace') }}: {{ persistenceCapabilities.namespace }} ·
              DB: {{ persistenceCapabilities.indexedDbDatabaseName }} ·
              Store: {{ persistenceCapabilities.indexedDbStoreName }}
            </p>
          </div>

          <div class="bg-white rounded-2xl p-4 space-y-3">
            <div class="flex items-start justify-between gap-3">
              <div>
                <p class="text-sm font-semibold">{{ t('存储一致性检查', 'Storage Consistency Check') }}</p>
                <p class="text-[10px] text-gray-500 mt-1">
                  {{
                    t(
                      '检查 localStorage 与 IndexedDB 镜像是否一致，并可一键修复不同步。',
                      'Checks whether localStorage and IndexedDB mirror stay aligned, with one-click repair for drift.',
                    )
                  }}
                </p>
                <p class="text-[10px] text-gray-400 mt-1">
                  {{ t('最后检查', 'Last check') }}: {{ formatStorageAuditTime(storageAuditAt) }}
                </p>
              </div>
              <button
                @click="runStorageAudit()"
                class="px-3 py-2 rounded-lg border border-gray-200 text-xs hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                :disabled="storageAuditRunning || storageRepairRunning"
              >
                {{ storageAuditRunning ? t('检查中...', 'Checking...') : t('运行检查', 'Run check') }}
              </button>
            </div>

            <p
              v-if="storageAuditFeedbackMessage"
              class="text-[11px]"
              :class="storageAuditFeedbackType === 'success' ? 'text-green-600' : storageAuditFeedbackType === 'warn' ? 'text-amber-600' : 'text-gray-500'"
            >
              {{ storageAuditFeedbackMessage }}
            </p>

            <div class="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2">
              <p class="text-[11px] text-gray-700">
                {{ t('最近存储报告', 'Latest storage report') }}:
                {{ storageReportReasonLabel(latestStorageReport) }}
              </p>
              <p class="text-[10px] text-gray-500 mt-1">
                {{ t('记录时间', 'Recorded at') }}:
                {{ formatStorageReportTime(latestStorageReport?.createdAt) }}
                ·
                {{ t('错误数', 'Errors') }}: {{ storageReportErrorCount }}
              </p>
            </div>

            <button
              @click="clearStorageReports"
              class="w-full py-2 rounded-lg text-xs font-medium border border-gray-200 text-gray-600 hover:bg-gray-50"
            >
              {{ t('清理存储报告', 'Clear storage reports') }}
            </button>

            <div v-if="storageAuditResults.length" class="space-y-2">
              <div
                v-for="item in storageAuditResults"
                :key="item.key"
                class="rounded-xl border border-gray-200 p-3"
              >
                <div class="flex items-center justify-between gap-2">
                  <p class="text-sm font-medium">{{ t(item.labelZh, item.labelEn) }}</p>
                  <span
                    class="px-2 py-0.5 rounded-full text-[10px] font-medium"
                    :class="storageAuditStatusClass(item)"
                  >
                    {{ storageAuditStatusLabel(item) }}
                  </span>
                </div>
                <p class="text-[10px] text-gray-500 mt-1">
                  localStorage: {{ storageLayerLabel(item.local, t('缺失', 'Missing')) }} ·
                  IndexedDB:
                  {{
                    item.mirrorApplicable
                      ? storageLayerLabel(item.indexeddb, t('缺失', 'Missing'))
                      : t('未启用', 'Disabled')
                  }}
                </p>
                <p class="text-[10px] text-gray-400 mt-1">
                  {{ t('建议修复来源', 'Recommended repair source') }}:
                  {{ storageAuditSourceLabel(item.recommendedSource) }}
                </p>
              </div>
            </div>

            <button
              @click="repairStorageDrift"
              class="w-full py-2 rounded-lg text-xs font-semibold transition border disabled:opacity-50 disabled:cursor-not-allowed"
              :class="storageRepairRunning ? 'bg-gray-100 text-gray-500 border-gray-200' : 'bg-white text-blue-600 border-blue-200 hover:bg-blue-50'"
              :disabled="storageRepairRunning || storageAuditRunning"
            >
              {{ storageRepairRunning ? t('修复中...', 'Repairing...') : t('修复存储不同步', 'Repair storage drift') }}
            </button>

            <div class="grid grid-cols-2 gap-2">
              <button
                @click="openNetworkReports('storage')"
                class="w-full py-2 rounded-lg text-xs font-medium border border-gray-200 text-gray-600 hover:bg-gray-50"
              >
                {{ t('查看全部报告', 'View all reports') }}
              </button>
              <button
                @click="openNetworkReports('storage', 'error')"
                class="w-full py-2 rounded-lg text-xs font-medium border border-amber-200 text-amber-700 hover:bg-amber-50"
              >
                {{ t('仅看错误', 'Errors only') }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
