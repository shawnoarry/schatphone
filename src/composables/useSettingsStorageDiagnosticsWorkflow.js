import { computed, getCurrentInstance, onBeforeUnmount, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useSystemStore } from '../stores/system'
import { useDialog } from './useDialog'
import { useI18n } from './useI18n'
import { useSystemApiReports } from './useSystemApiReports'
import {
  getPersistenceCapabilities as getDefaultPersistenceCapabilities,
  inspectPersistedStateLayers as inspectDefaultPersistedStateLayers,
  reconcilePersistedStateLayers as reconcileDefaultPersistedStateLayers,
} from '../lib/persistence'

const STORAGE_AUDIT_TARGETS = Object.freeze([
  { key: 'store:system', version: 1, labelZh: '系统存档', labelEn: 'System state' },
  { key: 'store:chat', version: 2, labelZh: '聊天存档', labelEn: 'Chat state' },
  { key: 'store:map', version: 2, labelZh: '地图存档', labelEn: 'Map state' },
  { key: 'store:calendar', version: 1, labelZh: '日历存档', labelEn: 'Calendar state' },
  { key: 'store:reminders', version: 1, labelZh: '提醒事项', labelEn: 'Reminders state' },
  { key: 'store:gallery', version: 1, labelZh: '素材存档', labelEn: 'Gallery state' },
  { key: 'store:files', version: 1, labelZh: '文件索引', labelEn: 'Files index' },
  { key: 'store:shopping', version: 1, labelZh: '购物记录', labelEn: 'Shopping records' },
  { key: 'store:food-delivery', version: 1, labelZh: '外卖记录', labelEn: 'Food delivery records' },
  { key: 'store:simulation', version: 1, labelZh: '事件模拟', labelEn: 'Simulation events' },
  { key: 'store:assets', version: 1, labelZh: '资产记录', labelEn: 'Assets records' },
  { key: 'store:wallet', version: 1, labelZh: '钱包账本', labelEn: 'Wallet ledger' },
  { key: 'store:phone', version: 1, labelZh: '电话记录', labelEn: 'Phone logs' },
  { key: 'store:stock', version: 1, labelZh: '模拟行情', labelEn: 'Simulated market' },
  { key: 'store:relationship-runtime', version: 1, labelZh: '关系运行时', labelEn: 'Relationship runtime' },
])

export const useSettingsStorageDiagnosticsWorkflow = (options = {}) => {
  const systemStore = options.systemStore || useSystemStore()
  const systemApiReports = options.systemApiReports || useSystemApiReports({ systemStore })
  const { t } = options.t ? { t: options.t } : useI18n()
  const { confirmDialog } = options.confirmDialog
    ? { confirmDialog: options.confirmDialog }
    : useDialog()
  const getPersistenceCapabilities =
    options.getPersistenceCapabilities || getDefaultPersistenceCapabilities
  const inspectPersistedStateLayers =
    options.inspectPersistedStateLayers || inspectDefaultPersistedStateLayers
  const reconcilePersistedStateLayers =
    options.reconcilePersistedStateLayers || reconcileDefaultPersistedStateLayers

  const { settings } = storeToRefs(systemStore)

  const storageAuditRunning = ref(false)
  const storageRepairRunning = ref(false)
  const storageAuditResults = ref([])
  const storageAuditAt = ref(0)
  const storageAuditFeedbackType = ref('')
  const storageAuditFeedbackMessage = ref('')
  let storageAuditFeedbackTimerId = null

  const persistenceCapabilities = computed(() => getPersistenceCapabilities())

  const persistenceCapabilityLabel = (available) =>
    available ? t('可用', 'Available') : t('不可用', 'Unavailable')

  const clearStorageAuditFeedbackTimer = () => {
    if (storageAuditFeedbackTimerId) clearTimeout(storageAuditFeedbackTimerId)
    storageAuditFeedbackTimerId = null
  }

  const setStorageAuditFeedback = (type, message, durationMs = 2200) => {
    storageAuditFeedbackType.value = type
    storageAuditFeedbackMessage.value = message
    clearStorageAuditFeedbackTimer()
    storageAuditFeedbackTimerId = setTimeout(() => {
      storageAuditFeedbackType.value = ''
      storageAuditFeedbackMessage.value = ''
      storageAuditFeedbackTimerId = null
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
    systemApiReports.addReport({
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

    const removed = systemApiReports.clearReports({ module: 'storage' })
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

  const getStorageLocale = () => {
    const language = settings.value.system?.language || ''
    return language.toLowerCase().startsWith('zh') ? 'zh-CN' : language || 'en-US'
  }

  const formatStorageAuditTime = (timestamp) => {
    const ts = Number(timestamp)
    if (!Number.isFinite(ts) || ts <= 0) return t('尚未检查', 'Not checked yet')
    try {
      return new Date(ts).toLocaleString(getStorageLocale())
    } catch {
      return new Date(ts).toLocaleString()
    }
  }

  const formatStorageReportTime = (timestamp) => {
    const ts = Number(timestamp)
    if (!Number.isFinite(ts) || ts <= 0) return t('尚无记录', 'No records yet')
    try {
      return new Date(ts).toLocaleString(getStorageLocale())
    } catch {
      return new Date(ts).toLocaleString()
    }
  }

  const latestStorageReport = computed(() => {
    return systemApiReports.latestReportByModule('storage')
  })

  const storageReportErrorCount = computed(() => {
    return systemApiReports.countReports({ moduleFilter: 'storage', levelFilter: 'error' })
  })

  const storageReportReasonLabel = (report) => {
    const code = (report?.code || '').toUpperCase()
    if (code === 'SIMULATION_TICK_TRIGGERED') return t('事件 tick 已触发', 'Simulation tick triggered')
    if (code === 'SIMULATION_TICK_SKIPPED') return t('事件 tick 已跳过', 'Simulation tick skipped')
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

  const disposeStorageDiagnosticsWorkflow = () => {
    clearStorageAuditFeedbackTimer()
  }

  if (getCurrentInstance()) {
    onBeforeUnmount(disposeStorageDiagnosticsWorkflow)
  }

  return {
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
    setStorageDiagnosticsFeedback: setStorageAuditFeedback,
    runStorageAudit,
    clearStorageReports,
    repairStorageDrift,
    disposeStorageDiagnosticsWorkflow,
  }
}
