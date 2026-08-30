import { computed, getCurrentInstance, onBeforeUnmount, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useSystemStore } from '../stores/system'
import { useChatStore } from '../stores/chat'
import { useChronicleStore } from '../stores/chronicle'
import { useCalendarStore } from '../stores/calendar'
import { useAgendaJourneyStore } from '../stores/agendaJourney'
import { useActivitySessionStore } from '../stores/activitySession'
import { useScheduleOrchestratorStore } from '../stores/scheduleOrchestrator'
import { useRemindersStore } from '../stores/reminders'
import { useMapStore } from '../stores/map'
import { useGalleryStore } from '../stores/gallery'
import { useFilesStore } from '../stores/files'
import { useBookStore } from '../stores/book'
import { usePhoneStore } from '../stores/phone'
import { useAssetsStore } from '../stores/assets'
import { useShoppingStore } from '../stores/shopping'
import { useFoodDeliveryStore } from '../stores/foodDelivery'
import { useSimulationStore } from '../stores/simulation'
import { useStockStore } from '../stores/stock'
import { useWalletStore } from '../stores/wallet'
import { useRelationshipRuntimeStore } from '../stores/relationshipRuntime'
import { useImageGenerationStore } from '../stores/imageGeneration'
import { useMiniSceneStore } from '../stores/miniScene'
import { useWorkHubStore } from '../stores/workHub'
import { useDialog } from './useDialog'
import { useI18n } from './useI18n'
import { useSystemApiReports } from './useSystemApiReports'
import {
  COMPLETE_BACKUP_SCHEMA_VERSION,
  assertCompleteBackupPackage,
  createCompleteBackupPackage,
  inspectCompleteBackupPackage,
} from '../lib/complete-backup-package'
import {
  completeBackupRestoreCheckpoint,
  markBackupRestoreCheckpointHardFailure,
  stageBackupRestoreCheckpoint,
} from '../lib/backup-restore-checkpoint'
import { restoreBackupRollbackSnapshot } from '../lib/backup-restore-runtime'

const BACKUP_SCHEMA_VERSION = COMPLETE_BACKUP_SCHEMA_VERSION
const BACKUP_COPY_TONE_DIRECT = 'direct'
const BACKUP_COPY_TONE_IMMERSIVE = 'immersive'

const formatBytes = (bytes = 0) => {
  const normalized = Number(bytes)
  if (!Number.isFinite(normalized) || normalized <= 0) return '0 B'
  if (normalized < 1024) return `${Math.round(normalized)} B`
  if (normalized < 1024 * 1024) return `${(normalized / 1024).toFixed(1)} KB`
  return `${(normalized / (1024 * 1024)).toFixed(2)} MB`
}

const deepClone = (value) => {
  if (typeof structuredClone === 'function') {
    try {
      return structuredClone(value)
    } catch {
      // Vue reactive proxies are not always structured-cloneable in the import rollback path.
    }
  }
  return JSON.parse(JSON.stringify(value))
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

const isAssetRecordLike = (item) =>
  item &&
  typeof item === 'object' &&
  typeof (item.name || item.title) === 'string' &&
  (
    Object.prototype.hasOwnProperty.call(item, 'estimatedValue') ||
    Object.prototype.hasOwnProperty.call(item, 'estimatedValueCents') ||
    Object.prototype.hasOwnProperty.call(item, 'purchaseValue') ||
    Object.prototype.hasOwnProperty.call(item, 'purchaseValueCents')
  )

const isAssetsBackupSection = (section) => {
  if (!section || typeof section !== 'object') return false
  const records = Array.isArray(section.records)
    ? section.records
    : Array.isArray(section.assetRecords)
      ? section.assetRecords
      : Array.isArray(section.items)
        ? section.items
        : null
  if (!records) return false
  if (records.length === 0) return true
  return records.some((item) => isAssetRecordLike(item))
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
  if (payload.miniScene && typeof payload.miniScene === 'object') return true
  if (payload.gallery && typeof payload.gallery === 'object') return true
  if (payload.files && typeof payload.files === 'object') return true
  if (payload.book && typeof payload.book === 'object') return true
  if (payload.shopping && typeof payload.shopping === 'object') return true
  if (payload.foodDelivery && typeof payload.foodDelivery === 'object') return true
  if (payload.simulation && typeof payload.simulation === 'object') return true
  if (isAssetsBackupSection(payload.assets)) return true
  if (Array.isArray(payload.assets)) return true
  if (payload.wallet && typeof payload.wallet === 'object') return true
  if (payload.phone && typeof payload.phone === 'object') return true
  if (payload.stock && typeof payload.stock === 'object') return true
  if (payload.relationshipRuntime && typeof payload.relationshipRuntime === 'object') return true
  if (payload.imageGeneration && typeof payload.imageGeneration === 'object') return true
  if (payload.workHub && typeof payload.workHub === 'object') return true
  if (payload.chronicle && typeof payload.chronicle === 'object') return true
  return false
}

const restoreOptionalBackupSection = (store, section) => {
  if (!section || typeof section !== 'object') return true
  return store.restoreFromBackup(section)
}

const saveStores = async (stores = []) => {
  const results = await Promise.allSettled(
    stores.map((store) => Promise.resolve().then(() => store.saveNow())),
  )
  const failed = results.find(
    (result) =>
      result.status === 'rejected' ||
      (result.status === 'fulfilled' && result.value?.ok === false),
  )
  return { ok: !failed, results }
}

export const useSettingsBackupWorkflow = (options = {}) => {
  const systemStore = options.systemStore || useSystemStore()
  const chatStore = options.chatStore || useChatStore()
  const chronicleStore = options.chronicleStore || useChronicleStore()
  const calendarStore = options.calendarStore || useCalendarStore()
  const agendaJourneyStore = options.agendaJourneyStore || useAgendaJourneyStore()
  const activitySessionStore = options.activitySessionStore || useActivitySessionStore()
  const scheduleOrchestratorStore =
    options.scheduleOrchestratorStore || useScheduleOrchestratorStore()
  const remindersStore = options.remindersStore || useRemindersStore()
  const mapStore = options.mapStore || useMapStore()
  const galleryStore = options.galleryStore || useGalleryStore()
  const filesStore = options.filesStore || useFilesStore()
  const bookStore = options.bookStore || useBookStore()
  const phoneStore = options.phoneStore || usePhoneStore()
  const assetsStore = options.assetsStore || useAssetsStore()
  const shoppingStore = options.shoppingStore || useShoppingStore()
  const foodDeliveryStore = options.foodDeliveryStore || useFoodDeliveryStore()
  const simulationStore = options.simulationStore || useSimulationStore()
  const stockStore = options.stockStore || useStockStore()
  const walletStore = options.walletStore || useWalletStore()
  const relationshipRuntimeStore =
    options.relationshipRuntimeStore || useRelationshipRuntimeStore()
  const imageGenerationStore = options.imageGenerationStore || useImageGenerationStore()
  const miniSceneStore = options.miniSceneStore || useMiniSceneStore()
  const workHubStore = options.workHubStore || useWorkHubStore()
  const systemApiReports = options.systemApiReports || useSystemApiReports({ systemStore })
  const { t } = options.t ? { t: options.t } : useI18n()
  const { confirmDialog } = options.confirmDialog
    ? { confirmDialog: options.confirmDialog }
    : useDialog()

  const { settings, user, notifications, truthState } = storeToRefs(systemStore)
  const {
    moduleAvatarOverrides,
    moduleIdentity,
    roleProfiles,
    contactsLifecycle,
    contacts,
    chatHistory,
    conversations,
    messagesByConversation,
  } = storeToRefs(chatStore)

  const backupExporting = ref(false)
  const backupImporting = ref(false)
  const backupFileInput = ref(null)
  const backupFeedbackType = ref('')
  const backupFeedbackMessage = ref('')
  const backupIncludeAssetPackage = ref(true)
  let backupFeedbackTimerId = null

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
      '完整模式会校验全部已保留素材；任一素材缺失或损坏时不会导出不完整备份。',
      'Complete mode verifies every retained asset and stops instead of exporting an incomplete backup.',
      '完整行李会逐件核验；少一件或损坏一件都会停止打包。',
      'Full luggage is checked item by item; missing or damaged material stops packaging.',
    ),
  )

  const backupExportStartedMessage = computed(() =>
    resolveBackupCopy(
      '备份文件下载已开始。',
      'Backup download has started.',
      '备份列车已发车，文件开始下载。',
      'Backup train departed; download has started.',
    ),
  )

  const clearBackupFeedbackTimer = () => {
    if (backupFeedbackTimerId) clearTimeout(backupFeedbackTimerId)
    backupFeedbackTimerId = null
  }

  const setBackupFeedback = (type, message, durationMs = 1800) => {
    backupFeedbackType.value = type
    backupFeedbackMessage.value = message
    clearBackupFeedbackTimer()
    backupFeedbackTimerId = setTimeout(() => {
      backupFeedbackType.value = ''
      backupFeedbackMessage.value = ''
      backupFeedbackTimerId = null
    }, durationMs)
  }

  const setBackupCopyTone = (tone) => {
    settings.value.system.backupCopyTone =
      tone === BACKUP_COPY_TONE_IMMERSIVE
        ? BACKUP_COPY_TONE_IMMERSIVE
        : BACKUP_COPY_TONE_DIRECT
  }

  const setBackupIncludeAssetPackage = (value) => {
    backupIncludeAssetPackage.value = value === true
  }

  const writeBackupStorageReport = ({
    level = 'info',
    action = 'export_backup',
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

  const buildBackupPayload = async () => {
    const includeAssetPackage = backupIncludeAssetPackage.value === true
    const gallerySnapshot = await galleryStore.createBackupSnapshotAsync({
      includeAssetPackage,
      maxPackageBytes: Number.MAX_SAFE_INTEGER,
      maxPackageItems: Number.MAX_SAFE_INTEGER,
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
            maxPackageBytes: Number.MAX_SAFE_INTEGER,
            maxPackageItems: Number.MAX_SAFE_INTEGER,
          }

    if (
      includeAssetPackage &&
      (Number(packageSummary.skippedCount || 0) > 0 ||
        Number(packageSummary.missingCount || 0) > 0 ||
        Boolean(packageSummary.overflow))
    ) {
      const error = new Error('Retained Gallery material could not be packaged completely.')
      error.code = 'BINARY_MISSING'
      throw error
    }

    const payload = {
      backupMeta: {
        schemaVersion: BACKUP_SCHEMA_VERSION,
        exportedAt: Date.now(),
        exportMode: includeAssetPackage ? 'metadata_with_asset_package' : 'metadata_only',
        galleryAssetPackage: packageSummary,
      },
      settings: settings.value,
      user: user.value,
      notifications: notifications.value,
      apiReports: systemApiReports.createReportSnapshot(),
      truthState: truthState.value,
      moduleAvatarOverrides: moduleAvatarOverrides.value,
      moduleIdentity: moduleIdentity.value,
      roleProfiles: roleProfiles.value,
      contactsLifecycle: contactsLifecycle.value,
      contacts: contacts.value,
      chatHistory: chatHistory.value,
      conversations: conversations.value,
      messagesByConversation: messagesByConversation.value,
      map: {
        ...mapStore.createBackupSnapshot(),
      },
      calendar: {
        ...calendarStore.createBackupSnapshot(),
        agendaJourney: agendaJourneyStore.createBackupSnapshot(),
        activitySession: activitySessionStore.createBackupSnapshot(),
        scheduleOrchestrator: scheduleOrchestratorStore.createBackupSnapshot(),
      },
      miniScene: miniSceneStore.createBackupSnapshot(),
      reminders: remindersStore.createBackupSnapshot(),
      gallery: gallerySnapshot,
      files: filesStore.createBackupSnapshot(),
      book: bookStore.createBackupSnapshot(),
      shopping: shoppingStore.createBackupSnapshot(),
      foodDelivery: foodDeliveryStore.createBackupSnapshot(),
      simulation: simulationStore.createBackupSnapshot(),
      assets: assetsStore.createBackupSnapshot(),
      wallet: walletStore.createBackupSnapshot(),
      phone: phoneStore.createBackupSnapshot(),
      stock: stockStore.createBackupSnapshot(),
      relationshipRuntime: relationshipRuntimeStore.createBackupSnapshot(),
      imageGeneration: imageGenerationStore.exportForBackup(),
      workHub: workHubStore.createBackupSnapshot(),
      chronicle: chronicleStore.createBackupSnapshot(),
    }
    const completePackage = await createCompleteBackupPackage(payload)
    return assertCompleteBackupPackage(completePackage)
  }

  const validateBackupPayload = async (payload) => {
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

    if ([3, 4, 5, 6, COMPLETE_BACKUP_SCHEMA_VERSION].includes(schemaVersion)) {
      const inspection = await inspectCompleteBackupPackage(payload)
      if (!inspection.ok) {
        return {
          ok: false,
          code: inspection.errors[0]?.code || 'BACKUP_IMPORT_INTEGRITY_FAILED',
          message: t(
            '备份完整性校验失败，当前存档未发生变化。',
            'Backup integrity verification failed; the current save was not changed.',
          ),
          schemaVersion,
          inspection,
        }
      }
      return {
        ok: true,
        code: '',
        message: '',
        schemaVersion,
        inspection,
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
    const code = (typeof error?.code === 'string' && error.code.trim())
      ? error.code.trim().toUpperCase()
      : ''
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

  const confirmSensitiveBackupExport = () =>
    confirmDialog({
      title: t('导出敏感备份文件', 'Export sensitive backup file'),
      message: t(
        '这份完整备份文件包含已配置的 API 凭据，以及聊天、角色、世界等私密本地数据。只应保存到可信位置，不应直接分享。',
        'This complete backup file contains configured API credentials and private local data such as chats, roles, and world content. Save it only to a trusted location and do not share it directly.',
      ),
      confirmText: t('我已了解，继续下载', 'I understand, continue download'),
      cancelText: t('取消下载', 'Cancel download'),
      tone: 'danger',
    })

  const exportData = async () => {
    if (backupExporting.value) return
    backupExporting.value = true
    try {
      const confirmed = await confirmSensitiveBackupExport()
      if (!confirmed) return

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
      writeBackupStorageReport({
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
      writeBackupStorageReport({
        level: 'error',
        action: 'export_backup',
        code: 'BACKUP_EXPORT_FAILED',
        message,
      })
    } finally {
      backupExporting.value = false
    }
  }

  const restoreAssetsBackupSection = (section) => {
    if (!isAssetsBackupSection(section)) return true
    return assetsStore.restoreFromBackup(section)
  }

  const createRollbackSnapshot = async () => {
    const gallery = await galleryStore.createBackupSnapshotAsync({
      includeAssetPackage: true,
      maxPackageBytes: Number.MAX_SAFE_INTEGER,
      maxPackageItems: Number.MAX_SAFE_INTEGER,
    })
    if (
      Number(gallery?.packageSummary?.skippedCount || 0) > 0 ||
      Number(gallery?.packageSummary?.missingCount || 0) > 0 ||
      Boolean(gallery?.packageSummary?.overflow)
    ) {
      throw createBackupImportError(
        'BACKUP_IMPORT_ROLLBACK_SNAPSHOT_INCOMPLETE',
        t(
          '无法完整暂存当前素材，导入已在修改数据前停止。',
          'The current material library could not be staged completely; import stopped before changing data.',
        ),
      )
    }
    const snapshot = {
      system: {
        settings: deepClone(settings.value),
        user: deepClone(user.value),
        notifications: deepClone(notifications.value),
        apiReports: systemApiReports.createReportSnapshot(),
        truthState: deepClone(truthState.value),
      },
      chat: {
        moduleAvatarOverrides: deepClone(moduleAvatarOverrides.value),
        moduleIdentity: deepClone(moduleIdentity.value),
        roleProfiles: deepClone(roleProfiles.value),
        contactsLifecycle: deepClone(contactsLifecycle.value),
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
      miniScene: miniSceneStore.createBackupSnapshot(),
      agendaJourney: agendaJourneyStore.createBackupSnapshot(),
      activitySession: activitySessionStore.createBackupSnapshot(),
      scheduleOrchestrator: scheduleOrchestratorStore.createBackupSnapshot(),
      reminders: remindersStore.createBackupSnapshot(),
      gallery,
      files: filesStore.createBackupSnapshot(),
      book: bookStore.createBackupSnapshot(),
      shopping: shoppingStore.createBackupSnapshot(),
      foodDelivery: foodDeliveryStore.createBackupSnapshot(),
      simulation: simulationStore.createBackupSnapshot(),
      assets: assetsStore.createBackupSnapshot(),
      wallet: walletStore.createBackupSnapshot(),
      phone: phoneStore.createBackupSnapshot(),
      stock: stockStore.createBackupSnapshot(),
      relationshipRuntime: relationshipRuntimeStore.createBackupSnapshot(),
      imageGeneration: imageGenerationStore.exportForBackup(),
      workHub: workHubStore.createBackupSnapshot(),
      chronicle: chronicleStore.createBackupSnapshot(),
    }
    return deepClone(snapshot)
  }

  const triggerImportData = () => {
    if (backupImporting.value || backupExporting.value) return
    backupFileInput.value?.click()
  }

  const resetImportInput = (event) => {
    if (!event?.target) return
    event.target.value = ''
  }

  const backupRestoreStoreSet = {
    system: systemStore,
    chat: chatStore,
    map: mapStore,
    calendar: calendarStore,
    miniScene: miniSceneStore,
    agendaJourney: agendaJourneyStore,
    activitySession: activitySessionStore,
    scheduleOrchestrator: scheduleOrchestratorStore,
    reminders: remindersStore,
    gallery: galleryStore,
    files: filesStore,
    book: bookStore,
    shopping: shoppingStore,
    foodDelivery: foodDeliveryStore,
    simulation: simulationStore,
    assets: assetsStore,
    wallet: walletStore,
    phone: phoneStore,
    stock: stockStore,
    relationshipRuntime: relationshipRuntimeStore,
    imageGeneration: imageGenerationStore,
    workHub: workHubStore,
    chronicle: chronicleStore,
  }

  const restoreRollbackSnapshot = (rollback) =>
    restoreBackupRollbackSnapshot(backupRestoreStoreSet, rollback)

  const backupStoresInSaveOrder = [
    systemStore,
    chatStore,
    mapStore,
    calendarStore,
    miniSceneStore,
    agendaJourneyStore,
    activitySessionStore,
    scheduleOrchestratorStore,
    remindersStore,
    galleryStore,
    filesStore,
    bookStore,
    shoppingStore,
    foodDeliveryStore,
    simulationStore,
    assetsStore,
    walletStore,
    phoneStore,
    stockStore,
    relationshipRuntimeStore,
    imageGenerationStore,
    workHubStore,
    chronicleStore,
  ]

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
    let rollback = null
    let restoreCheckpoint = null
    let restoreStarted = false

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

      const preflight = await validateBackupPayload(parsed)
      if (!preflight.ok) {
        throw createBackupImportError(preflight.code, preflight.message)
      }
      if (parsed.book && bookStore.storageReadOnly === true) {
        throw createBackupImportError(
          'BACKUP_IMPORT_STORAGE_READ_ONLY',
          t('Book 当前为只读状态，请先刷新当前存档后再导入。', 'Book is read-only. Refresh the current save before importing.'),
        )
      }

      rollback = await createRollbackSnapshot()
      if (typeof indexedDB !== 'undefined') {
        restoreCheckpoint = await stageBackupRestoreCheckpoint(rollback)
      }
      restoreStarted = true
      const systemOk = systemStore.restoreFromBackup(parsed)
      const chatOk = chatStore.restoreFromBackup(parsed)
      const mapOk = mapStore.restoreFromBackup(parsed.map || parsed)
      const calendarOk = calendarStore.restoreFromBackup(parsed.calendar || parsed)
      const miniSceneOk = miniSceneStore.restoreFromBackup(parsed.miniScene || {})
      const agendaJourneyOk = agendaJourneyStore.restoreFromBackup(
        parsed.calendar?.agendaJourney || parsed.agendaJourney || {},
      )
      const activitySessionOk = activitySessionStore.restoreFromBackup(
        parsed.calendar?.activitySession || parsed.activitySession || {},
      )
      const scheduleOrchestratorOk = scheduleOrchestratorStore.restoreFromBackup(
        parsed.calendar?.scheduleOrchestrator || parsed.scheduleOrchestrator || {},
      )
      const remindersOk = remindersStore.restoreFromBackup(
        parsed.reminders || parsed.calendar || parsed,
      )
      const galleryRestoreResult = await galleryStore.restoreFromBackupAsync(parsed.gallery || parsed, {
        restoreAssetPackage: true,
        preserveCurrentOnlyAssets: preflight.schemaVersion >= 3,
        requireCompleteAssetPackage:
          preflight.schemaVersion >= 3 &&
          parsed?.backupMeta?.galleryAssetPackage?.requested === true,
      })
      const filesOk = restoreOptionalBackupSection(filesStore, parsed.files)
      const bookOk = restoreOptionalBackupSection(bookStore, parsed.book)
      const shoppingOk = restoreOptionalBackupSection(shoppingStore, parsed.shopping)
      const foodDeliveryOk = restoreOptionalBackupSection(foodDeliveryStore, parsed.foodDelivery)
      const simulationOk = restoreOptionalBackupSection(simulationStore, parsed.simulation)
      const assetsOk = restoreAssetsBackupSection(parsed.assets)
      const walletOk = restoreOptionalBackupSection(walletStore, parsed.wallet)
      const phoneOk = restoreOptionalBackupSection(phoneStore, parsed.phone)
      const stockOk = restoreOptionalBackupSection(stockStore, parsed.stock)
      const relationshipRuntimeOk = restoreOptionalBackupSection(
        relationshipRuntimeStore,
        parsed.relationshipRuntime,
      )
      const imageGenerationOk = restoreOptionalBackupSection(
        imageGenerationStore,
        parsed.imageGeneration,
      )
      const workHubOk = restoreOptionalBackupSection(workHubStore, parsed.workHub)
      const chronicleOk = restoreOptionalBackupSection(chronicleStore, parsed.chronicle)
      if (
        !systemOk ||
        !chatOk ||
        !mapOk ||
        !calendarOk ||
        !miniSceneOk ||
        !agendaJourneyOk ||
        !activitySessionOk ||
        !scheduleOrchestratorOk ||
        !remindersOk ||
        !galleryRestoreResult?.ok ||
        !filesOk ||
        !bookOk ||
        !shoppingOk ||
        !foodDeliveryOk ||
        !simulationOk ||
        !assetsOk ||
        !walletOk ||
        !phoneOk ||
        !stockOk ||
        !relationshipRuntimeOk ||
        !imageGenerationOk ||
        !workHubOk ||
        !chronicleOk
      ) {
        throw createBackupImportError(
          'BACKUP_IMPORT_STRUCTURE_UNSUPPORTED',
          t('备份结构不完整或不受支持。', 'Backup structure is incomplete or unsupported.'),
        )
      }

      const storeSave = await saveStores(backupStoresInSaveOrder)
      if (!storeSave.ok) {
        throw createBackupImportError(
          'BACKUP_IMPORT_STORAGE_WRITE_FAILED',
          t('备份内容已读取，但未能安全写入当前存储。', 'Backup data was read but could not be committed safely.'),
        )
      }

      if (restoreCheckpoint) {
        const checkpointCompleted = await completeBackupRestoreCheckpoint(restoreCheckpoint, {
          recoveryAction: 'backup_restore_committed_and_reopened',
        })
        if (!checkpointCompleted) {
          throw createBackupImportError(
            'BACKUP_IMPORT_CHECKPOINT_FINALIZE_FAILED',
            t(
              '恢复内容已写入，但恢复日志未能安全关闭。',
              'Restored data was written, but the recovery checkpoint could not be closed safely.',
            ),
          )
        }
        restoreCheckpoint = null
      }

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
      writeBackupStorageReport({
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
      const rollbackRestore = restoreStarted
        ? await restoreRollbackSnapshot(rollback)
        : { ok: true, exact: true, refreshedOwners: [], storesToSave: [] }
      const rollbackSave = restoreStarted
        ? await saveStores(rollbackRestore.storesToSave)
        : { ok: true, results: [] }
      const rollbackSafe = rollbackRestore.ok && rollbackSave.ok
      if (restoreCheckpoint) {
        try {
          if (rollbackSafe) {
            await completeBackupRestoreCheckpoint(restoreCheckpoint, {
              recoveryAction: 'backup_restore_failed_previous_save_restored',
              errorCode: error?.code || 'backup_import_failed',
            })
          } else {
            await markBackupRestoreCheckpointHardFailure(
              restoreCheckpoint,
              error?.code || 'rollback_failed',
            )
          }
        } catch {
          // A nonterminal durable checkpoint remains available for startup recovery.
        }
        restoreCheckpoint = null
      }
      const resolved = resolveBackupImportFailure(error)
      const detail = resolved.detail ? ` ${resolved.detail}` : ''
      const rollbackMessage = !restoreStarted
        ? t('导入在修改数据前失败。', 'Import failed before any data was changed.')
        : !rollbackSafe
          ? t(
              '导入失败，且自动恢复未能安全完成。请刷新当前存档或重新打开应用后检查数据。',
              'Import failed, and automatic recovery could not be completed safely. Refresh the current save or reopen the app and review the data.',
            )
          : rollbackRestore.exact
            ? t('导入失败，已自动回滚。', 'Import failed and rolled back automatically.')
            : t(
                '导入失败；其他数据已回滚，Book 已在存储冲突后刷新为当前权威存档。',
                'Import failed. Other data was rolled back, and Book refreshed from the authoritative current save after a storage conflict.',
              )
      const message = `${rollbackMessage}${detail}`
      setBackupFeedback(
        'error',
        message,
        3200,
      )
      writeBackupStorageReport({
        level: 'error',
        action: 'import_backup',
        code: rollbackSafe
          ? resolved.code || 'BACKUP_IMPORT_FAILED'
          : 'BACKUP_IMPORT_ROLLBACK_INCOMPLETE',
        message,
        model: typeof file?.name === 'string' ? file.name : '',
      })
    } finally {
      backupImporting.value = false
    }
  }

  const disposeBackupWorkflow = () => {
    clearBackupFeedbackTimer()
  }

  if (getCurrentInstance()) {
    onBeforeUnmount(disposeBackupWorkflow)
  }

  return {
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
    disposeBackupWorkflow,
  }
}
