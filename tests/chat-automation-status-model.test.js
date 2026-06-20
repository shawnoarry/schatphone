import { describe, expect, test } from 'vitest'
import { ref } from 'vue'
import {
  formatChatAutomationStatusTime,
  useChatAutomationStatusModel,
} from '../src/composables/useChatAutomationStatusModel'

const t = (zh, en) => en || zh

const createModel = ({
  activeChat = { id: 1 },
  aiPrefs = { autoInvokeEnabled: true },
  conversation = {},
  settings = {
    aiAutomation: { conflictCooldownSec: 20 },
    system: {
      realPushEnabled: true,
      pushSubscriptionActive: true,
      pushServerUrl: 'https://push.example.test',
      pushDeviceId: 'device-1',
    },
  },
  notificationEnabled = true,
  languageBase = 'en',
  systemLanguage = 'en-US',
  automationEnabled = true,
  policy = { enabled: true, invokeEnabled: true },
  policyByTime,
  now = 1_800_000_000_000,
} = {}) =>
  useChatAutomationStatusModel({
    activeChat: ref(activeChat),
    activeAiPrefs: ref(aiPrefs),
    activeConversation: ref(conversation),
    settings: ref(settings),
    systemNotifications: {
      notificationEnabled: ref(notificationEnabled),
    },
    languageBase: ref(languageBase),
    systemLanguage: ref(systemLanguage),
    isChatAutomationEnabled: () => automationEnabled,
    getChatAutomationRuntimePolicy: (baseAt) =>
      typeof policyByTime === 'function' ? policyByTime(baseAt) : policy,
    now: () => now,
    t,
  })

describe('Chat automation status model interface', () => {
  test('formats automation times with stable fallbacks', () => {
    expect(formatChatAutomationStatusTime(0, 'en-US')).toBe('--:--')
    expect(formatChatAutomationStatusTime('bad', 'en-US')).toBe('--:--')
    expect(formatChatAutomationStatusTime(Date.UTC(2026, 0, 1, 8, 9, 10), 'en-US')).not.toBe(
      '--:--',
    )
  })

  test('reports disabled automation and thread-level disabled schedule copy', () => {
    const disabled = createModel({ automationEnabled: false })

    expect(disabled.chatAutomationEnabled.value).toBe(false)
    expect(disabled.autoScheduleHintText.value).toBe('Global or Chat automation is currently disabled.')
    expect(disabled.autoBackgroundReminderHint.value).toMatchObject({
      tone: 'warning',
      text: 'Background reminder is off because global or Chat automation is disabled.',
    })

    const threadDisabled = createModel({ aiPrefs: { autoInvokeEnabled: false } })
    expect(threadDisabled.autoScheduleHintText.value).toBe(
      'Timed autonomous invoke is disabled in this thread.',
    )
    expect(threadDisabled.autoLastTriggeredHintText.value).toBe('')
  })

  test('shows notify-only and quiet-hours schedule hints from the runtime policy', () => {
    const notifyOnly = createModel({
      policy: { enabled: true, invokeEnabled: false, notifyOnly: true },
    })
    expect(notifyOnly.autoScheduleHintText.value).toBe(
      'Notify-only mode active: push notifications without autonomous AI generation.',
    )

    const quietHours = createModel({
      policy: {
        enabled: true,
        invokeEnabled: false,
        notifyOnly: true,
        quietHoursActive: true,
      },
    })
    expect(quietHours.autoScheduleHintText.value).toBe(
      'Quiet hours active: notify-only, no autonomous AI generation.',
    )
  })

  test('shows next, last, and restore settlement automation hints', () => {
    const model = createModel({
      conversation: {
        autoNextAt: 1_800_000_060_000,
        autoLastTriggeredAt: 1_800_000_030_000,
        autoLastSettledMissedCycles: 2,
        autoLastSettledAt: 1_800_000_040_000,
      },
    })

    expect(model.autoScheduleHintText.value).toContain('Next planned invoke:')
    expect(model.autoLastTriggeredHintText.value).toContain('Last autonomous invoke:')
    expect(model.autoRestoreSettlementHintText.value).toContain('Resume settlement: 2 cycle(s)')
  })

  test('reports background reminder readiness states without changing scheduling', () => {
    expect(createModel({ notificationEnabled: false }).autoBackgroundReminderHint.value).toMatchObject({
      tone: 'warning',
      text: 'Background reminder is not armed because real push is not fully authorized or subscribed.',
    })

    expect(createModel({ conversation: {} }).autoBackgroundReminderHint.value).toMatchObject({
      tone: 'muted',
      text: 'Background reminder is waiting to sync and will refresh after saving.',
    })

    expect(
      createModel({
        conversation: { autoNextAt: 1_800_000_000_500 },
      }).autoBackgroundReminderHint.value,
    ).toMatchObject({
      tone: 'muted',
      text: 'This cycle is already due, so foreground handling takes priority instead of a separate background reminder.',
    })
  })

  test('reports blocked, notify-only, and armed background reminder states', () => {
    expect(
      createModel({
        conversation: { autoNextAt: 1_800_000_060_000 },
        policyByTime: () => ({ enabled: true, invokeEnabled: false }),
      }).autoBackgroundReminderHint.value,
    ).toMatchObject({
      tone: 'warning',
      text: 'Background reminder is not armed because the current automation policy blocks this cycle.',
    })

    expect(
      createModel({
        conversation: { autoNextAt: 1_800_000_060_000 },
        policyByTime: () => ({ enabled: true, invokeEnabled: false, notifyOnly: true }),
      }).autoBackgroundReminderHint.value,
    ).toMatchObject({
      tone: 'warning',
      text: 'Notify-only mode is active, so no background reminder is armed for this cycle.',
    })

    const armed = createModel({
      conversation: {
        autoNextAt: 1_800_000_060_000,
        autoPushScheduleId: 'schedule-1',
        autoPushScheduledAt: 1_800_000_050_000,
      },
    })
    expect(armed.autoBackgroundReminderHint.value).toMatchObject({
      tone: 'success',
    })
    expect(armed.autoBackgroundReminderHint.value.text).toContain('Background reminder armed:')
  })
})
