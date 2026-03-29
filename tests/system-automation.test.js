import { beforeEach, describe, expect, test } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useSystemStore } from '../src/stores/system'

describe('system automation controls', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  test('respects global and module automation switches', () => {
    const store = useSystemStore()

    expect(store.isAiAutomationEnabledForModule('chat')).toBe(false)
    expect(store.isAiAutomationEnabledForModule('map')).toBe(false)

    store.settings.aiAutomation.masterEnabled = true
    expect(store.isAiAutomationEnabledForModule('chat')).toBe(true)
    expect(store.isAiAutomationEnabledForModule('map')).toBe(false)

    store.settings.aiAutomation.modules.map.enabled = true
    expect(store.isAiAutomationEnabledForModule('map')).toBe(true)
  })

  test('enforces single active autonomous execution lock', () => {
    const store = useSystemStore()
    store.settings.aiAutomation.masterEnabled = true
    store.settings.aiAutomation.modules.chat.enabled = true
    store.settings.aiAutomation.modules.map.enabled = true

    expect(store.tryAcquireAutoExecution('chat', 'contact:1')).toBe(true)
    expect(store.activeAutoExecution.module).toBe('chat')

    expect(store.tryAcquireAutoExecution('map', 'map:auto')).toBe(false)
    expect(store.tryAcquireAutoExecution('chat', 'contact:1:retry')).toBe(true)

    expect(store.releaseAutoExecution('map')).toBe(false)
    expect(store.releaseAutoExecution('chat')).toBe(true)
    expect(store.activeAutoExecution.module).toBe('')
  })

  test('supports runtime policy for quiet hours and notify-only mode', () => {
    const store = useSystemStore()
    store.settings.aiAutomation.masterEnabled = true
    store.settings.aiAutomation.modules.chat.enabled = true
    store.settings.aiAutomation.quietHoursEnabled = true
    store.settings.aiAutomation.quietHoursStart = '23:00'
    store.settings.aiAutomation.quietHoursEnd = '07:00'

    const quietPolicy = store.getAiAutomationRuntimePolicy(
      'chat',
      Date.UTC(2026, 0, 1, 23, 30, 0),
      { timezone: 'UTC' },
    )
    expect(quietPolicy.enabled).toBe(true)
    expect(quietPolicy.quietHoursActive).toBe(true)
    expect(quietPolicy.notifyOnly).toBe(true)
    expect(quietPolicy.invokeEnabled).toBe(false)

    const daytimePolicy = store.getAiAutomationRuntimePolicy(
      'chat',
      Date.UTC(2026, 0, 1, 12, 0, 0),
      { timezone: 'UTC' },
    )
    expect(daytimePolicy.quietHoursActive).toBe(false)
    expect(daytimePolicy.notifyOnly).toBe(false)
    expect(daytimePolicy.invokeEnabled).toBe(true)

    store.settings.aiAutomation.notifyOnlyMode = true
    const notifyOnlyPolicy = store.getAiAutomationRuntimePolicy('chat')
    expect(notifyOnlyPolicy.notifyOnly).toBe(true)
    expect(store.tryAcquireAutoExecution('chat', 'notify-only-check')).toBe(false)
  })

  test('keeps only latest 200 API reports and supports clear', () => {
    const store = useSystemStore()

    for (let i = 0; i < 220; i += 1) {
      store.addApiReport({
        level: 'error',
        module: 'network',
        action: 'fetch_models',
        statusCode: 429,
        code: 'RATE_LIMIT',
        message: `error-${i}`,
      })
    }

    expect(store.apiReports.length).toBe(200)
    expect(store.apiReports[0].message).toBe('error-219')
    expect(store.apiReports[199].message).toBe('error-20')

    store.clearApiReports()
    expect(store.apiReports.length).toBe(0)
  })
})
