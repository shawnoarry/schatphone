import { computed } from 'vue'

const translateWith = (t, zh, en) => (typeof t === 'function' ? t(zh, en) : en || zh)

const readValue = (source, fallback = null) =>
  source && typeof source === 'object' && 'value' in source ? source.value : fallback

export const formatChatAutomationStatusTime = (timestamp, locale = 'en-US') => {
  if (!timestamp) return '--:--'
  const date = new Date(timestamp)
  if (Number.isNaN(date.getTime())) return '--:--'
  return date.toLocaleTimeString(locale || 'en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

export const useChatAutomationStatusModel = ({
  activeChat,
  activeAiPrefs,
  activeConversation,
  settings,
  systemNotifications,
  systemLanguage,
  languageBase,
  isChatAutomationEnabled,
  getChatAutomationRuntimePolicy,
  now = () => Date.now(),
  t,
} = {}) => {
  const translate = (zh, en) => translateWith(t, zh, en)

  const automationSettings = computed(() => readValue(settings, {})?.aiAutomation || null)

  const chatAutomationEnabled = computed(() =>
    typeof isChatAutomationEnabled === 'function' ? Boolean(isChatAutomationEnabled()) : false,
  )

  const chatAutomationPolicyNow = computed(() =>
    typeof getChatAutomationRuntimePolicy === 'function'
      ? getChatAutomationRuntimePolicy(Number(now()) || Date.now())
      : {},
  )

  const autoStatusLocale = computed(() =>
    readValue(languageBase, '') === 'zh' ? 'zh-CN' : readValue(systemLanguage, 'en-US'),
  )

  const formatAutoStatusTime = (timestamp) =>
    formatChatAutomationStatusTime(timestamp, autoStatusLocale.value)

  const autoScheduleHintText = computed(() => {
    if (!activeChat?.value) return ''
    if (!chatAutomationEnabled.value) {
      return translate(
        '全局或 Chat 模块自动响应已关闭。',
        'Global or Chat automation is currently disabled.',
      )
    }
    if (!activeAiPrefs?.value?.autoInvokeEnabled) {
      return translate(
        '当前会话未开启定时自主调用。',
        'Timed autonomous invoke is disabled in this thread.',
      )
    }

    if (chatAutomationPolicyNow.value?.notifyOnly) {
      return chatAutomationPolicyNow.value.quietHoursActive
        ? translate(
            '当前处于安静时段：仅通知，不自动生成回复。',
            'Quiet hours active: notify-only, no autonomous AI generation.',
          )
        : translate(
            '当前为仅通知模式：仅推送通知，不自动生成回复。',
            'Notify-only mode active: push notifications without autonomous AI generation.',
          )
    }

    const nextAt = activeConversation?.value?.autoNextAt || 0
    if (!nextAt) {
      return translate(
        '定时器等待中，保存设置后会自动刷新下一次触发时间。',
        'Timer is pending. Next invoke time refreshes after saving settings.',
      )
    }

    return `${translate('下次预计触发', 'Next planned invoke')}: ${formatAutoStatusTime(nextAt)}`
  })

  const autoLastTriggeredHintText = computed(() => {
    if (!activeChat?.value || !activeAiPrefs?.value?.autoInvokeEnabled) return ''
    const lastAt = activeConversation?.value?.autoLastTriggeredAt || 0
    if (!lastAt) {
      return translate('尚无自动调用记录。', 'No autonomous invoke history yet.')
    }
    return `${translate('上次自动调用', 'Last autonomous invoke')}: ${formatAutoStatusTime(lastAt)}`
  })

  const autoRestoreSettlementHintText = computed(() => {
    if (!activeChat?.value || !activeAiPrefs?.value?.autoInvokeEnabled) return ''
    const missedCycles = Number(activeConversation?.value?.autoLastSettledMissedCycles || 0)
    if (!Number.isFinite(missedCycles) || missedCycles <= 0) return ''

    const settledAt = Number(activeConversation?.value?.autoLastSettledAt || 0)
    const settledAtText = settledAt ? formatAutoStatusTime(settledAt) : '--:--'
    return `${translate('恢复补算', 'Resume settlement')}: ${missedCycles} ${translate(
      '个周期',
      'cycle(s)',
    )} · ${settledAtText}`
  })

  const autoBackgroundReminderHint = computed(() => {
    if (!activeChat?.value) {
      return { text: '', tone: 'muted' }
    }

    if (!chatAutomationEnabled.value) {
      return {
        text: translate(
          '后台提醒未启用：全局或 Chat 自动响应关闭。',
          'Background reminder is off because global or Chat automation is disabled.',
        ),
        tone: 'warning',
      }
    }

    if (!activeAiPrefs?.value?.autoInvokeEnabled) {
      return {
        text: translate(
          '后台提醒未启用：当前会话未开启定时自主调用。',
          'Background reminder is off because timed invoke is disabled in this thread.',
        ),
        tone: 'muted',
      }
    }

    const systemSettings = readValue(settings, {})?.system || {}
    const remotePushReady =
      Boolean(systemNotifications?.notificationEnabled?.value) &&
      systemSettings.realPushEnabled === true &&
      systemSettings.pushSubscriptionActive === true &&
      typeof systemSettings.pushServerUrl === 'string' &&
      systemSettings.pushServerUrl.trim() &&
      typeof systemSettings.pushDeviceId === 'string' &&
      systemSettings.pushDeviceId.trim()

    if (!remotePushReady) {
      return {
        text: translate(
          '后台提醒未布置：真推送尚未完成授权或订阅。',
          'Background reminder is not armed because real push is not fully authorized or subscribed.',
        ),
        tone: 'warning',
      }
    }

    const currentTime = Number(now()) || Date.now()
    const nextAt = Number(activeConversation?.value?.autoNextAt || 0)
    if (!nextAt) {
      return {
        text: translate(
          '后台提醒等待同步：保存设置后会自动刷新。',
          'Background reminder is waiting to sync and will refresh after saving.',
        ),
        tone: 'muted',
      }
    }

    if (nextAt <= currentTime + 1000) {
      return {
        text: translate(
          '当前已进入触发窗口：前台处理优先，本轮不再单独布置后台提醒。',
          'This cycle is already due, so foreground handling takes priority instead of a separate background reminder.',
        ),
        tone: 'muted',
      }
    }

    const duePolicy =
      typeof getChatAutomationRuntimePolicy === 'function'
        ? getChatAutomationRuntimePolicy(nextAt)
        : {}
    if (duePolicy.invokeEnabled !== true) {
      return duePolicy.notifyOnly
        ? {
            text: duePolicy.quietHoursActive
              ? translate(
                  '下个周期落在安静时段：不会自动生成回复，也不会提前布置后台提醒。',
                  'The next cycle falls in quiet hours, so no autonomous reply or background reminder is armed.',
                )
              : translate(
                  '当前为仅通知模式：本轮不会布置后台提醒。',
                  'Notify-only mode is active, so no background reminder is armed for this cycle.',
                ),
            tone: 'warning',
          }
        : {
            text: translate(
              '后台提醒未布置：当前自动响应策略不允许该周期执行。',
              'Background reminder is not armed because the current automation policy blocks this cycle.',
            ),
            tone: 'warning',
          }
    }

    const scheduleId =
      typeof activeConversation?.value?.autoPushScheduleId === 'string'
        ? activeConversation.value.autoPushScheduleId.trim()
        : ''
    const scheduledAt = Number(activeConversation?.value?.autoPushScheduledAt || 0)

    if (scheduleId && scheduledAt > currentTime) {
      return {
        text: `${translate('后台提醒已布置', 'Background reminder armed')}: ${formatAutoStatusTime(
          scheduledAt,
        )}`,
        tone: 'success',
      }
    }

    return {
      text: translate(
        '后台提醒等待同步：系统会自动校准下一次远程提醒。',
        'Background reminder is waiting to sync. The system will auto-calibrate the next remote reminder.',
      ),
      tone: 'muted',
    }
  })

  return {
    automationSettings,
    chatAutomationEnabled,
    chatAutomationPolicyNow,
    autoStatusLocale,
    formatAutoStatusTime,
    autoScheduleHintText,
    autoLastTriggeredHintText,
    autoRestoreSettlementHintText,
    autoBackgroundReminderHint,
  }
}
