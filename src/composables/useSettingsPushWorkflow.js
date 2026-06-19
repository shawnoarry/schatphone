import { computed, getCurrentInstance, onBeforeUnmount, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useSystemStore } from '../stores/system'
import { useDialog } from './useDialog'
import { useI18n } from './useI18n'
import { useSystemApiReports } from './useSystemApiReports'
import { useSystemNotifications } from './useSystemNotifications'
import {
  checkPushServerHealth as checkDefaultPushServerHealth,
  isWebPushSupported as isDefaultWebPushSupported,
  normalizePushDisplayMode,
  normalizePushServerUrl,
  readPushPermission as readDefaultPushPermission,
  sendTestPush as sendDefaultTestPush,
  subscribeWebPush as subscribeDefaultWebPush,
  syncExistingWebPushSubscription as syncDefaultExistingWebPushSubscription,
  unsubscribeWebPush as unsubscribeDefaultWebPush,
} from '../lib/push'

export const useSettingsPushWorkflow = (options = {}) => {
  const systemStore = options.systemStore || useSystemStore()
  const systemApiReports = options.systemApiReports || useSystemApiReports({ systemStore })
  const systemNotifications =
    options.systemNotifications || useSystemNotifications({ systemStore })
  const { t } = options.t ? { t: options.t } : useI18n()
  const { confirmDialog } = options.confirmDialog
    ? { confirmDialog: options.confirmDialog }
    : useDialog()
  const checkPushServerHealth =
    options.checkPushServerHealth || checkDefaultPushServerHealth
  const isWebPushSupported = options.isWebPushSupported || isDefaultWebPushSupported
  const readPushPermission = options.readPushPermission || readDefaultPushPermission
  const sendTestPush = options.sendTestPush || sendDefaultTestPush
  const subscribeWebPush = options.subscribeWebPush || subscribeDefaultWebPush
  const syncExistingWebPushSubscription =
    options.syncExistingWebPushSubscription || syncDefaultExistingWebPushSubscription
  const unsubscribeWebPush = options.unsubscribeWebPush || unsubscribeDefaultWebPush

  const { settings } = storeToRefs(systemStore)

  const notificationSaved = ref(false)
  const pushActionRunning = ref(false)
  const pushHealthRunning = ref(false)
  const pushFeedbackType = ref('')
  const pushFeedbackMessage = ref('')
  const pushServerHealthState = ref('idle')
  const pushServerHealthMessage = ref('')
  const pushLastHealthCheckAt = ref(0)
  let notificationSavedTimerId = null
  let pushFeedbackTimerId = null

  const notificationEnabled = systemNotifications.notificationEnabled

  const focusModeEnabled = computed(() =>
    systemStore.isMoreFeatureToggleEnabled('focus_mode'),
  )

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

  const clearNotificationSavedTimer = () => {
    if (notificationSavedTimerId) clearTimeout(notificationSavedTimerId)
    notificationSavedTimerId = null
  }

  const clearPushFeedbackTimer = () => {
    if (pushFeedbackTimerId) clearTimeout(pushFeedbackTimerId)
    pushFeedbackTimerId = null
  }

  const setPushFeedback = (type, message, durationMs = 2200) => {
    pushFeedbackType.value = type
    pushFeedbackMessage.value = message
    clearPushFeedbackTimer()
    pushFeedbackTimerId = setTimeout(() => {
      pushFeedbackType.value = ''
      pushFeedbackMessage.value = ''
      pushFeedbackTimerId = null
    }, durationMs)
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
    clearNotificationSavedTimer()
    notificationSavedTimerId = setTimeout(() => {
      notificationSaved.value = false
      notificationSavedTimerId = null
    }, 1200)
  }

  const updateNotificationEnabled = (enabled) => {
    systemNotifications.setNotificationEnabled(enabled)
    saveNotificationSettings()
  }

  const updateFocusModeEnabled = (enabled) => {
    systemStore.setMoreFeatureToggle('focus_mode', enabled === true)
    saveNotificationSettings()
  }

  const updateRealPushEnabled = (enabled) => {
    settings.value.system.realPushEnabled = enabled === true
    saveNotificationSettings()
  }

  const updatePushDisplayMode = (mode) => {
    settings.value.system.pushDisplayMode = mode
    saveNotificationSettings()
  }

  const updatePushServerUrl = (serverUrl) => {
    settings.value.system.pushServerUrl = serverUrl
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
        systemApiReports.addReport({
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
        systemApiReports.addReport({
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
          pushSubscriptionActive: hasMissingLocalSubscription
            ? false
            : settings.value.system.pushSubscriptionActive,
          pushLastError: result.message || '',
        })
        systemApiReports.addReport({
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
        systemApiReports.addReport({
          level: 'info',
          module: 'push',
          action: 'resync',
          message: t('浏览器订阅已重新同步。', 'Browser subscription resynced.'),
        })
      }
      if (!silent) {
        setPushFeedback(
          'success',
          t(
            '当前浏览器订阅已重新同步到 Push Server。',
            'Current browser subscription has been resynced to Push Server.',
          ),
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
        systemApiReports.addReport({
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
      systemApiReports.addReport({
        level: 'info',
        module: 'push',
        action: 'subscribe',
        message: t('真推送订阅成功。', 'Real push subscribed successfully.'),
      })
      setPushFeedback(
        'success',
        t(
          '真推送已连接，现在可以发送系统级测试通知。',
          'Real push connected. You can send a system-level test now.',
        ),
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
        systemApiReports.addReport({
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
      systemApiReports.addReport({
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
        systemApiReports.addReport({
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
      systemApiReports.addReport({
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

  const syncPushPermissionFromBrowser = () => {
    systemStore.syncPushPermissionFromBrowser()
  }

  const disposeSettingsPushWorkflow = () => {
    clearNotificationSavedTimer()
    clearPushFeedbackTimer()
  }

  if (getCurrentInstance()) {
    onBeforeUnmount(disposeSettingsPushWorkflow)
  }

  return {
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
    setPushFeedback,
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
    disposeSettingsPushWorkflow,
  }
}
