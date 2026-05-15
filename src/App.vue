<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute, useRouter } from 'vue-router'
import AppDialogHost from './components/AppDialogHost.vue'
import { useSystemStore } from './stores/system'
import { useChatStore } from './stores/chat'
import { useGalleryStore } from './stores/gallery'
import { useMapStore } from './stores/map'
import { useI18n } from './composables/useI18n'
import {
  appendForegroundBannerQueue,
  collectForegroundBannerNotes,
} from './lib/foreground-banner-queue'
import { resolveNotificationModuleMeta as resolveNotificationModuleMetaBase } from './lib/notification-presentation'
import {
  cancelScheduledPushNotification,
  checkPushServerHealth,
  normalizePushServerUrl,
  readPushPermission,
  schedulePushNotification,
  syncExistingWebPushSubscription,
} from './lib/push'

const router = useRouter()
const route = useRoute()
const systemStore = useSystemStore()
const chatStore = useChatStore()
const galleryStore = useGalleryStore()
const mapStore = useMapStore()
const { systemLanguage, languageBase, t } = useI18n()

const { settings, notifications } = storeToRefs(systemStore)

const currentTime = ref('')
const currentDate = ref('')
const currentWallpaper = ref('')
const customVarStyle = computed(() => settings.value.appearance.customVars || {})
const screenBackgroundImage = computed(() => {
  const wallpaper = typeof currentWallpaper.value === 'string' ? currentWallpaper.value.trim() : ''
  if (!wallpaper) return 'var(--system-wallpaper-fallback)'
  return `url(${JSON.stringify(wallpaper)}), var(--system-wallpaper-fallback)`
})
const showStatusBar = computed(() => settings.value.appearance.showStatusBar !== false)
const isLockRoute = computed(() => route.path === '/lock')
const showHomeIndicator = computed(() => !isLockRoute.value && !systemStore.isLocked)
const timeLocale = computed(() => (languageBase.value === 'zh' ? 'zh-CN' : systemLanguage.value))
const dateLocale = computed(() => (languageBase.value === 'zh' ? 'zh-CN' : systemLanguage.value))
const notificationLocale = computed(() =>
  languageBase.value === 'zh' ? 'zh-CN' : systemLanguage.value,
)
const resolveNotificationModuleMeta = (note) =>
  resolveNotificationModuleMetaBase(
    note,
    notificationLocale.value,
    settings.value.appearance?.appIconOverrides || {},
  )
const shellBannerVisible = ref(false)
const shellBannerNote = ref(null)
const shellBannerQueue = ref([])
const showShellBanner = computed(
  () => Boolean(shellBannerVisible.value && shellBannerNote.value && !isLockRoute.value && !systemStore.isLocked),
)

let timerId = null
let backupReminderTimerId = null
let backupReminderVisibilityHandler = null
let automationTickTimerId = null
let automationVisibilityHandler = null
let customCssStyleEl = null
let mapAutoNextAt = 0
let chatAutoPushSyncPromise = null
let chatAutoPushVisibilityHandler = null
let shellBannerTimerId = null
let shellBannerVisibilityHandler = null
let seenShellNotificationIds = new Set()

const MAP_AUTOMATION_MODULE_KEY = 'map'
const CHAT_AUTOMATION_MODULE_KEY = 'chat'
const MAP_AUTOMATION_INTERVAL_MS = 6 * 60 * 1000
const ROOT_AUTOMATION_IDLE_TICK_MS = 30 * 1000
const ROOT_AUTOMATION_ACTIVE_TICK_MS = 5 * 1000
const PUSH_STARTUP_SELF_HEAL_ACTION_HEALTH = 'health_check'
const PUSH_STARTUP_SELF_HEAL_ACTION_RESYNC = 'resync'
const SHELL_WALLPAPER_PREVIEW_SCOPE = 'app-shell-wallpaper'

let wallpaperResolveVersion = 0

const updateTime = () => {
  const now = new Date()
  currentTime.value = now.toLocaleTimeString(timeLocale.value, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
  currentDate.value = now.toLocaleDateString(dateLocale.value, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
}

const resolveCurrentWallpaper = async () => {
  wallpaperResolveVersion += 1
  const resolveVersion = wallpaperResolveVersion
  const appearance = settings.value.appearance || {}
  const wallpaperMode =
    typeof appearance.wallpaperMode === 'string' && appearance.wallpaperMode.trim()
      ? appearance.wallpaperMode.trim()
      : 'theme'
  const wallpaperAssetId =
    typeof appearance.wallpaperAssetId === 'string' ? appearance.wallpaperAssetId.trim() : ''
  const customWallpaperUrl =
    typeof appearance.wallpaper === 'string' ? appearance.wallpaper.trim() : ''
  const themeWallpaper =
    systemStore.getThemeWallpaper(appearance.currentTheme) || customWallpaperUrl || ''

  galleryStore.releaseAssetPreviewScope(SHELL_WALLPAPER_PREVIEW_SCOPE)

  if (wallpaperMode === 'gallery') {
    if (!wallpaperAssetId) {
      systemStore.useThemeWallpaper()
      currentWallpaper.value = themeWallpaper
      return
    }

    const asset = galleryStore.findAssetById(wallpaperAssetId)
    if (!asset) {
      if (galleryStore.hasFinishedStorageHydration === true) {
        systemStore.clearAppearanceWallpaperAsset({
          fallbackToTheme: true,
        })
      }
      currentWallpaper.value = themeWallpaper
      return
    }

    const previewUrl = await galleryStore.getAssetPreviewUrl(wallpaperAssetId, {
      scopeId: SHELL_WALLPAPER_PREVIEW_SCOPE,
    })
    if (resolveVersion !== wallpaperResolveVersion) {
      galleryStore.releaseAssetPreview(wallpaperAssetId, SHELL_WALLPAPER_PREVIEW_SCOPE)
      return
    }

    if (previewUrl) {
      currentWallpaper.value = previewUrl
      return
    }

    systemStore.clearAppearanceWallpaperAsset({
      fallbackToTheme: true,
    })
    currentWallpaper.value = themeWallpaper
    return
  }

  if (wallpaperMode === 'url') {
    if (customWallpaperUrl) {
      currentWallpaper.value = customWallpaperUrl
      return
    }
    systemStore.useThemeWallpaper()
    currentWallpaper.value = themeWallpaper
    return
  }

  currentWallpaper.value = themeWallpaper
}

const formatBannerTime = (timestamp) => {
  if (!timestamp) return ''
  const time = new Date(timestamp)
  if (Number.isNaN(time.getTime())) return ''
  return time.toLocaleTimeString(timeLocale.value, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

const clearShellBannerTimer = () => {
  if (!shellBannerTimerId) return
  clearTimeout(shellBannerTimerId)
  shellBannerTimerId = null
}

const canPresentForegroundBanner = () =>
  !systemStore.isLocked &&
  route.path !== '/lock' &&
  typeof document !== 'undefined' &&
  document.visibilityState === 'visible'

const hideShellBanner = ({ clearQueue = false } = {}) => {
  clearShellBannerTimer()
  shellBannerVisible.value = false
  shellBannerNote.value = null
  if (clearQueue) {
    shellBannerQueue.value = []
  }
}

const flushShellBannerQueue = () => {
  if (shellBannerVisible.value) return
  if (!canPresentForegroundBanner()) return
  if (!Array.isArray(shellBannerQueue.value) || shellBannerQueue.value.length === 0) return

  const [nextNote, ...rest] = shellBannerQueue.value
  shellBannerQueue.value = rest
  showForegroundBanner(nextNote)
}

const showForegroundBanner = (note) => {
  if (!note) return
  shellBannerNote.value = note
  shellBannerVisible.value = true
  clearShellBannerTimer()
  shellBannerTimerId = setTimeout(() => {
    hideShellBanner()
    flushShellBannerQueue()
  }, 2800)
}

const openShellBannerNotification = () => {
  const note = shellBannerNote.value
  if (!note) return
  hideShellBanner()
  systemStore.markNotificationRead(note.id)
  if (typeof note.route === 'string' && note.route.trim()) {
    router.push(note.route)
    return
  }
  router.push('/home')
}

const ensureCustomCssStyleEl = () => {
  if (customCssStyleEl) return customCssStyleEl
  customCssStyleEl = document.createElement('style')
  customCssStyleEl.setAttribute('data-schatphone-custom-css', 'true')
  document.head.appendChild(customCssStyleEl)
  return customCssStyleEl
}

const syncCustomCss = (cssText) => {
  const styleEl = ensureCustomCssStyleEl()
  styleEl.textContent = cssText || ''
}

watch(
  () => settings.value.appearance.customCss,
  (value) => {
    syncCustomCss(value)
  },
  { immediate: true },
)

watch(
  () => [
    settings.value.appearance?.currentTheme,
    settings.value.appearance?.wallpaperMode,
    settings.value.appearance?.wallpaperAssetId,
    settings.value.appearance?.wallpaper,
    galleryStore.hasFinishedStorageHydration,
  ],
  () => {
    void resolveCurrentWallpaper()
  },
  { immediate: true },
)

watch(
  () => settings.value.appearance?.currentTheme,
  (themeId) => {
    if (typeof document === 'undefined') return
    document.documentElement.setAttribute('data-theme', themeId || 'default')
  },
  { immediate: true },
)

watch(
  () => {
    const wallpaperAssetId =
      typeof settings.value.appearance?.wallpaperAssetId === 'string'
        ? settings.value.appearance.wallpaperAssetId.trim()
        : ''
    const asset = wallpaperAssetId ? galleryStore.findAssetById(wallpaperAssetId) : null
    return asset
      ? `${asset.id}:${asset.updatedAt}:${asset.sourceType}:${asset.sourceUrl}:${asset.blobId}`
      : ''
  },
  () => {
    if (settings.value.appearance?.wallpaperMode !== 'gallery') return
    void resolveCurrentWallpaper()
  },
)

watch(
  systemLanguage,
  (value) => {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('lang', value)
    }
    updateTime()
    flushShellBannerQueue()
  },
  { immediate: true },
)

watch(
  () => ({
    masterEnabled: settings.value.aiAutomation?.masterEnabled,
    mapEnabled: settings.value.aiAutomation?.modules?.map?.enabled,
    mapPriority: settings.value.aiAutomation?.modules?.map?.priority,
    notifyOnlyMode: settings.value.aiAutomation?.notifyOnlyMode,
    quietHoursEnabled: settings.value.aiAutomation?.quietHoursEnabled,
    quietHoursStart: settings.value.aiAutomation?.quietHoursStart,
    quietHoursEnd: settings.value.aiAutomation?.quietHoursEnd,
    timezone: settings.value.system?.timezone,
  }),
  () => {
    if (!systemStore.isAiAutomationEnabledForModule(MAP_AUTOMATION_MODULE_KEY)) {
      mapAutoNextAt = 0
    }
    restartAutomationTickTimer()
    void runAutomationRootTick()
  },
  { deep: true },
)

watch(
  () => systemStore.aiAutomationQueue.length,
  () => {
    restartAutomationTickTimer()
    void runAutomationRootTick()
  },
)

watch(
  notifications,
  (list, prevList) => {
    if (!Array.isArray(list) || list.length === 0) return

    if (seenShellNotificationIds.size === 0 && (!Array.isArray(prevList) || prevList.length === 0)) {
      seenShellNotificationIds = new Set(list.map((item) => item.id))
      return
    }

    const incomingNotes = collectForegroundBannerNotes(list, seenShellNotificationIds)
    if (incomingNotes.length > 0 && canPresentForegroundBanner()) {
      shellBannerQueue.value = appendForegroundBannerQueue(
        shellBannerQueue.value,
        incomingNotes,
        shellBannerNote.value,
      )
      flushShellBannerQueue()
    }

    list.forEach((item) => {
      if (item?.id) seenShellNotificationIds.add(item.id)
    })
  },
  { immediate: true, deep: true },
)

watch(
  () => [route.path, systemStore.isLocked],
  () => {
    if (route.path === '/lock' || systemStore.isLocked) {
      hideShellBanner({ clearQueue: true })
      return
    }
    flushShellBannerQueue()
  },
  { immediate: true },
)

watch(
  () => ({
    pushEnabled: settings.value.system?.realPushEnabled,
    pushActive: settings.value.system?.pushSubscriptionActive,
    pushServerUrl: settings.value.system?.pushServerUrl,
    pushDeviceId: settings.value.system?.pushDeviceId,
    chatMasterEnabled: settings.value.aiAutomation?.masterEnabled,
    chatModuleEnabled: settings.value.aiAutomation?.modules?.chat?.enabled,
    notifyOnlyMode: settings.value.aiAutomation?.notifyOnlyMode,
    quietHoursEnabled: settings.value.aiAutomation?.quietHoursEnabled,
    quietHoursStart: settings.value.aiAutomation?.quietHoursStart,
    quietHoursEnd: settings.value.aiAutomation?.quietHoursEnd,
    chatThreads: chatStore.contacts
      .map((contact) => {
        const contactId = Number(contact?.id)
        if (!Number.isFinite(contactId) || contactId <= 0) return ''
        const resolved = chatStore.getContactById(contactId)
        const conversation = chatStore.getConversationByContactId(contactId)
        const prefs = chatStore.getConversationAiPrefs(contactId)
        return [
          contactId,
          resolved?.name || '',
          resolved?.kind || '',
          prefs.autoInvokeEnabled ? 1 : 0,
          prefs.autoInvokeIntervalSec || 0,
          conversation.autoNextAt || 0,
          conversation.autoPushScheduleId || '',
          conversation.autoPushScheduledAt || 0,
        ].join(':')
      })
      .join('|'),
  }),
  () => {
    void syncChatAutoPushSchedules()
  },
  { deep: true },
)

const runBackupReminderCheck = () => {
  const result = systemStore.checkBackupReminderDue(Date.now(), {
    title: t('SchatPhone 备份提醒', 'SchatPhone Backup Reminder'),
    content: t(
      '建议导出一次备份，防止浏览器清理导致数据丢失。',
      'Consider exporting a backup to prevent data loss after browser cleanup.',
    ),
    icon: 'fas fa-shield-heart',
    route: '/settings',
  })
  if (result?.triggered) {
    systemStore.saveNow()
  }
}

const enqueueMapAutomationTaskIfDue = (baseAt = Date.now()) => {
  const now = Number.isFinite(Number(baseAt)) ? Math.max(0, Math.floor(Number(baseAt))) : Date.now()
  const policy = systemStore.getAiAutomationRuntimePolicy(MAP_AUTOMATION_MODULE_KEY, now)
  if (!policy.enabled) {
    mapAutoNextAt = 0
    return false
  }
  if (!policy.invokeEnabled) {
    if (!mapAutoNextAt || mapAutoNextAt < now) {
      mapAutoNextAt = now + MAP_AUTOMATION_INTERVAL_MS
    }
    return false
  }
  if (!mapAutoNextAt) {
    mapAutoNextAt = now + MAP_AUTOMATION_INTERVAL_MS
    return false
  }
  if (now < mapAutoNextAt) return false

  const tripEstimate = mapStore.tripEstimate || {}
  const fingerprintBucket = Math.floor(now / MAP_AUTOMATION_INTERVAL_MS)
  const result = systemStore.enqueueAiAutomationTask(
    {
      moduleKey: MAP_AUTOMATION_MODULE_KEY,
      targetId: 'map:auto',
      source: 'map_background_tick',
      reason: 'map:auto',
      dueAt: now,
      fingerprint: `map:auto:${fingerprintBucket}`,
      payload: {
        locationText: mapStore.currentLocationText || '',
        minutes: Number(tripEstimate.minutes) || 0,
        distanceKm: Number(tripEstimate.distanceKm) || 0,
      },
    },
    {
      baseAt: now,
    },
  )
  mapAutoNextAt = now + MAP_AUTOMATION_INTERVAL_MS
  return Boolean(result?.accepted)
}

const runAutomationRootTick = async () => {
  if (!settings.value.aiAutomation?.masterEnabled) return
  enqueueMapAutomationTaskIfDue(Date.now())
  for (let i = 0; i < 4; i += 1) {
    const result = await systemStore.runAiAutomationQueueTick(Date.now())
    if (!result?.handled && !result?.queueAdvanced) break
  }
}

const restartAutomationTickTimer = () => {
  if (automationTickTimerId) {
    clearInterval(automationTickTimerId)
    automationTickTimerId = null
  }
  if (!settings.value.aiAutomation?.masterEnabled) return

  const interval =
    systemStore.aiAutomationQueue.length > 0
      ? ROOT_AUTOMATION_ACTIVE_TICK_MS
      : ROOT_AUTOMATION_IDLE_TICK_MS
  automationTickTimerId = setInterval(() => {
    if (document.hidden) return
    void runAutomationRootTick()
  }, interval)
}

const runPushStartupSelfHeal = async () => {
  systemStore.syncPushPermissionFromBrowser()
  if (settings.value.system?.notifications === false) return
  if (settings.value.system?.realPushEnabled !== true) return

  const serverUrl = normalizePushServerUrl(settings.value.system?.pushServerUrl, '')
  if (!serverUrl) {
    systemStore.setPushState({
      pushLastError: t('请先填写 Push Server 地址。', 'Enter a Push Server URL first.'),
    })
    systemStore.addApiReport({
      level: 'error',
      module: 'push',
      action: PUSH_STARTUP_SELF_HEAL_ACTION_HEALTH,
      code: 'server_url_missing',
      message: t('真推送已开启，但 Push Server 地址为空。', 'Real push is enabled, but Push Server URL is empty.'),
    })
    return
  }

  const healthResult = await checkPushServerHealth({ serverUrl })
  if (!healthResult.ok) {
    systemStore.setPushState({
      pushServerUrl: serverUrl,
      pushLastError:
        healthResult.message || t('Push Server 不可达。', 'Push Server is unreachable.'),
    })
    systemStore.addApiReport({
      level: 'error',
      module: 'push',
      action: PUSH_STARTUP_SELF_HEAL_ACTION_HEALTH,
      code: healthResult.reason || 'health_check_failed',
      message:
        healthResult.message || t('Push Server 不可达。', 'Push Server is unreachable.'),
    })
    return
  }

  const resyncResult = await syncExistingWebPushSubscription({
    serverUrl,
    deviceId: settings.value.system?.pushDeviceId || '',
  })
  if (!resyncResult.ok) {
    const permission = readPushPermission()
    const missingLocalSubscription = resyncResult.reason === 'subscription_missing'
    systemStore.setPushState({
      pushServerUrl: serverUrl,
      pushPermission: permission,
      pushSubscriptionActive: missingLocalSubscription
        ? false
        : settings.value.system?.pushSubscriptionActive,
      pushLastError:
        resyncResult.message || t('启动时重同步订阅失败。', 'Startup subscription resync failed.'),
    })
    systemStore.addApiReport({
      level: 'error',
      module: 'push',
      action: PUSH_STARTUP_SELF_HEAL_ACTION_RESYNC,
      code: resyncResult.reason || 'resync_failed',
      message:
        resyncResult.message || t('启动时重同步订阅失败。', 'Startup subscription resync failed.'),
    })
    return
  }

  systemStore.setPushState({
    pushServerUrl: resyncResult.serverUrl,
    pushDeviceId: resyncResult.deviceId,
    pushPermission: readPushPermission(),
    pushSubscriptionActive: true,
    pushLastSyncedAt: Date.now(),
    pushLastError: '',
  })
}

const canUseRemotePushScheduling = () => {
  const systemSettings = settings.value.system || {}
  return (
    systemSettings.notifications !== false &&
    systemSettings.realPushEnabled === true &&
    systemSettings.pushSubscriptionActive === true &&
    typeof systemSettings.pushServerUrl === 'string' &&
    systemSettings.pushServerUrl.trim() &&
    typeof systemSettings.pushDeviceId === 'string' &&
    systemSettings.pushDeviceId.trim()
  )
}

const buildChatAutoPushScheduleId = (contactId) => `chat_auto_${contactId}`

const buildChatAutoPushNotification = (contactId) => {
  const contact = chatStore.getContactById(contactId)
  const contactName = contact?.name || t('新消息', 'New message')
  const contactKind = contact?.kind || 'role'
  const serviceLike = contactKind === 'service' || contactKind === 'official'

  return {
    id: `chat_auto_note_${contactId}`,
    title: contactName,
    content: serviceLike
      ? t('有一条新提醒，返回会话查看。', 'There is a new reminder. Open the thread to check it.')
      : t('想找你聊聊，返回会话查看。', 'Wants to talk to you. Open the thread to check in.'),
    route: `/chat/${contactId}`,
    source: 'chat_auto_schedule',
    createdAt: Date.now(),
  }
}

const cancelChatAutoPushForContact = async (contactId, options = {}) => {
  const conversation = chatStore.getConversationByContactId(contactId)
  const scheduleId =
    (typeof options.scheduleId === 'string' && options.scheduleId.trim()) ||
    conversation.autoPushScheduleId ||
    buildChatAutoPushScheduleId(contactId)

  if (!scheduleId) return { ok: false, reason: 'schedule_missing' }
  const serverUrl = normalizePushServerUrl(settings.value.system?.pushServerUrl, '')
  if (!serverUrl) {
    chatStore.setConversationAutoState(contactId, {
      autoPushScheduleId: '',
      autoPushScheduledAt: 0,
    })
    return { ok: false, reason: 'server_url_missing' }
  }

  const result = await cancelScheduledPushNotification({
    serverUrl,
    scheduleId,
  })

  chatStore.setConversationAutoState(contactId, {
    autoPushScheduleId: '',
    autoPushScheduledAt: 0,
  })

  if (!result.ok) {
    systemStore.addApiReport({
      level: 'error',
      module: 'push',
      action: 'cancel_schedule',
      provider: 'push_relay',
      model: `chat:${contactId}`,
      code: result.reason || 'cancel_schedule_failed',
      message: result.message || t('取消聊天定时推送失败。', 'Failed to cancel scheduled chat push.'),
      createdAt: Date.now(),
    })
  }

  return result
}

const syncChatAutoPushSchedules = async ({ force = false } = {}) => {
  if (chatAutoPushSyncPromise) return chatAutoPushSyncPromise

  chatAutoPushSyncPromise = (async () => {
    const now = Date.now()
    const remotePushReady = canUseRemotePushScheduling()
    const serverUrl = normalizePushServerUrl(settings.value.system?.pushServerUrl, '')
    const deviceId = typeof settings.value.system?.pushDeviceId === 'string'
      ? settings.value.system.pushDeviceId.trim()
      : ''

    const contactIds = chatStore.contacts
      .map((contact) => Number(contact?.id))
      .filter((contactId) => Number.isFinite(contactId) && contactId > 0)

    for (const contactId of contactIds) {
      const conversation = chatStore.getConversationByContactId(contactId)
      const prefs = chatStore.getConversationAiPrefs(contactId)
      const dueAt = Number.isFinite(Number(conversation.autoNextAt))
        ? Math.max(0, Math.floor(Number(conversation.autoNextAt)))
        : 0
      const runtimePolicy = systemStore.getAiAutomationRuntimePolicy(
        CHAT_AUTOMATION_MODULE_KEY,
        dueAt || now,
      )

      const eligible =
        remotePushReady &&
        prefs.autoInvokeEnabled === true &&
        dueAt > now + 1000 &&
        runtimePolicy.invokeEnabled === true

      if (!eligible) {
        if (conversation.autoPushScheduleId) {
          await cancelChatAutoPushForContact(contactId, {
            scheduleId: conversation.autoPushScheduleId,
          })
        }
        continue
      }

      if (
        !force &&
        conversation.autoPushScheduleId &&
        Number(conversation.autoPushScheduledAt) === dueAt
      ) {
        continue
      }

      if (
        conversation.autoPushScheduleId &&
        Number(conversation.autoPushScheduledAt) > 0 &&
        Number(conversation.autoPushScheduledAt) !== dueAt
      ) {
        await cancelChatAutoPushForContact(contactId, {
          scheduleId: conversation.autoPushScheduleId,
        })
      }

      const result = await schedulePushNotification({
        serverUrl,
        deviceId,
        deliverAt: dueAt,
        scheduleId: buildChatAutoPushScheduleId(contactId),
        source: 'chat_auto_invoke',
        category: 'chat_auto',
        notification: {
          ...buildChatAutoPushNotification(contactId),
          pushDisplayMode: systemStore.settings.system.pushDisplayMode || 'minimal',
        },
      })

      if (!result.ok) {
        systemStore.addApiReport({
          level: 'error',
          module: 'push',
          action: 'schedule',
          provider: 'push_relay',
          model: `chat:${contactId}`,
          code: result.reason || 'schedule_failed',
          message: result.message || t('安排聊天定时推送失败。', 'Failed to schedule chat push.'),
          createdAt: Date.now(),
        })
        continue
      }

      chatStore.setConversationAutoState(contactId, {
        autoPushScheduleId: result.scheduleId || buildChatAutoPushScheduleId(contactId),
        autoPushScheduledAt: result.deliverAt || dueAt,
      })
    }
  })().finally(() => {
    chatAutoPushSyncPromise = null
  })

  return chatAutoPushSyncPromise
}

onMounted(() => {
  updateTime()
  timerId = setInterval(updateTime, 1000)
  void runPushStartupSelfHeal().finally(() => {
    void mapStore.ensureTripArrivalPushScheduled({
      source: 'app_startup',
    })
    void syncChatAutoPushSchedules({
      force: true,
    })
  })
  runBackupReminderCheck()
  backupReminderTimerId = setInterval(runBackupReminderCheck, 60 * 1000)
  backupReminderVisibilityHandler = () => {
    if (document.hidden) return
    runBackupReminderCheck()
  }
  document.addEventListener('visibilitychange', backupReminderVisibilityHandler, { passive: true })
  mapStore.ensureMapAutomationHandlerRegistered()
  void runAutomationRootTick()
  restartAutomationTickTimer()
  automationVisibilityHandler = () => {
    if (document.hidden) return
    restartAutomationTickTimer()
    void runAutomationRootTick()
  }
  document.addEventListener('visibilitychange', automationVisibilityHandler, { passive: true })
  chatAutoPushVisibilityHandler = () => {
    void syncChatAutoPushSchedules({
      force: document.hidden === true,
    })
  }
  document.addEventListener('visibilitychange', chatAutoPushVisibilityHandler, { passive: true })
  shellBannerVisibilityHandler = () => {
    if (document.hidden) return
    flushShellBannerQueue()
  }
  document.addEventListener('visibilitychange', shellBannerVisibilityHandler, { passive: true })
})

onBeforeUnmount(() => {
  clearShellBannerTimer()
  if (timerId) {
    clearInterval(timerId)
  }
  if (backupReminderTimerId) {
    clearInterval(backupReminderTimerId)
    backupReminderTimerId = null
  }
  if (backupReminderVisibilityHandler) {
    document.removeEventListener('visibilitychange', backupReminderVisibilityHandler)
    backupReminderVisibilityHandler = null
  }
  if (automationTickTimerId) {
    clearInterval(automationTickTimerId)
    automationTickTimerId = null
  }
  if (automationVisibilityHandler) {
    document.removeEventListener('visibilitychange', automationVisibilityHandler)
    automationVisibilityHandler = null
  }
  if (chatAutoPushVisibilityHandler) {
    document.removeEventListener('visibilitychange', chatAutoPushVisibilityHandler)
    chatAutoPushVisibilityHandler = null
  }
  if (shellBannerVisibilityHandler) {
    document.removeEventListener('visibilitychange', shellBannerVisibilityHandler)
    shellBannerVisibilityHandler = null
  }
  if (customCssStyleEl) {
    customCssStyleEl.remove()
    customCssStyleEl = null
  }
  galleryStore.releaseAssetPreviewScope(SHELL_WALLPAPER_PREVIEW_SCOPE)
})

const goHome = () => {
  if (systemStore.isLocked) return
  hideShellBanner()
  router.push('/home')
}

const lockPhone = () => {
  hideShellBanner()
  systemStore.lockPhone()
  router.push('/lock')
}
</script>

<template>
  <div
    class="app-shell"
    :data-theme="settings.appearance.currentTheme"
    :data-statusbar="showStatusBar ? 'on' : 'off'"
    :style="customVarStyle"
  >
    <div class="screen" :style="{ backgroundImage: screenBackgroundImage }">
      <div
        v-if="showStatusBar"
        class="absolute top-0 w-full h-8 px-6 flex justify-between items-center text-xs font-medium z-40 select-none status-fg"
      >
        <span>{{ currentTime }}</span>
        <div class="flex gap-1.5">
          <i class="fas fa-signal"></i>
          <i class="fas fa-wifi"></i>
          <i class="fas fa-battery-full"></i>
          <button
            v-if="!isLockRoute"
            class="ml-1 w-5 h-5 rounded-full border border-current/30 flex items-center justify-center text-[10px] hover:bg-black/10"
            :title="t('锁屏', 'Lock Screen')"
            @click.stop="lockPhone"
          >
            <i class="fas fa-lock"></i>
          </button>
        </div>
      </div>

      <transition name="shell-banner">
        <button
          v-if="showShellBanner && shellBannerNote"
          class="app-shell-banner glass"
          @click="openShellBannerNotification"
        >
          <div
            class="app-shell-banner-icon"
            :class="resolveNotificationModuleMeta(shellBannerNote).toneClass"
          >
            <i :class="resolveNotificationModuleMeta(shellBannerNote).icon"></i>
          </div>
          <div class="min-w-0 flex-1 text-left">
            <div class="app-shell-banner-head">
              <span
                class="app-shell-banner-chip"
                :class="resolveNotificationModuleMeta(shellBannerNote).toneClass"
              >
                {{ resolveNotificationModuleMeta(shellBannerNote).label }}
              </span>
              <span class="app-shell-banner-time">{{ formatBannerTime(shellBannerNote.createdAt) }}</span>
            </div>
            <p class="app-shell-banner-title">{{ shellBannerNote.title }}</p>
            <p class="app-shell-banner-body">{{ shellBannerNote.content }}</p>
          </div>
        </button>
      </transition>

      <RouterView v-slot="{ Component }">
        <component :is="Component" :current-time="currentTime" :current-date="currentDate" />
      </RouterView>

      <div v-if="showHomeIndicator" class="home-indicator" @click="goHome"></div>
    </div>
  </div>

  <AppDialogHost />
</template>

<style scoped>
.app-shell-banner {
  position: absolute;
  top: calc(38px + env(safe-area-inset-top));
  left: 14px;
  right: 14px;
  z-index: 45;
  display: flex;
  align-items: flex-start;
  gap: 10px;
  border: 1px solid var(--system-border-light);
  border-radius: var(--system-radius-md);
  padding: 11px 12px;
  color: var(--system-text);
  background: var(--system-surface-strong);
  box-shadow: var(--system-shadow-soft);
  backdrop-filter: blur(var(--system-blur-lg)) saturate(1.25);
  -webkit-backdrop-filter: blur(var(--system-blur-lg)) saturate(1.25);
}

.app-shell-banner-icon {
  width: 32px;
  height: 32px;
  border-radius: 11px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: var(--system-accent-soft);
  color: var(--system-accent);
}

.app-shell-banner-icon.accent-default,
.app-shell-banner-chip.accent-default {
  background: linear-gradient(135deg, rgba(93, 130, 149, 0.96) 0%, rgba(56, 94, 117, 0.94) 100%);
  color: #fff;
}

.app-shell-banner-icon.accent-cool,
.app-shell-banner-chip.accent-cool {
  background: linear-gradient(135deg, rgba(111, 148, 154, 0.96) 0%, rgba(61, 105, 116, 0.94) 100%);
  color: #fff;
}

.app-shell-banner-icon.accent-warm,
.app-shell-banner-chip.accent-warm {
  background: linear-gradient(135deg, rgba(186, 133, 104, 0.96) 0%, rgba(143, 95, 79, 0.94) 100%);
  color: #fff;
}

.app-shell-banner-icon.accent-light,
.app-shell-banner-chip.accent-light {
  background: rgba(255, 255, 255, 0.9);
  color: #334155;
}

.app-shell-banner-icon.accent-dark,
.app-shell-banner-chip.accent-dark {
  background: rgba(15, 23, 42, 0.9);
  color: #fff;
}

.app-shell-banner-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.app-shell-banner-chip {
  display: inline-flex;
  align-items: center;
  max-width: 100%;
  border-radius: 999px;
  padding: 3px 8px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.02em;
  background: var(--system-accent-soft);
  color: var(--system-accent);
}

.app-shell-banner-time {
  flex-shrink: 0;
  font-size: 10px;
  opacity: 0.72;
}

.app-shell-banner-title {
  margin-top: 5px;
  font-size: 12px;
  font-weight: 700;
  line-height: 1.3;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.app-shell-banner-body {
  margin-top: 2px;
  font-size: 12px;
  line-height: 1.35;
  opacity: 0.9;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.shell-banner-enter-active,
.shell-banner-leave-active {
  transition: opacity var(--system-motion-base), transform var(--system-motion-base);
}

.shell-banner-enter-from,
.shell-banner-leave-to {
  opacity: 0;
  transform: translateY(-10px) scale(0.98);
}
</style>
