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

  test('executes queued tasks by module priority', async () => {
    const store = useSystemStore()
    store.settings.aiAutomation.masterEnabled = true
    store.settings.aiAutomation.modules.chat.enabled = true
    store.settings.aiAutomation.modules.map.enabled = true
    store.settings.aiAutomation.modules.chat.priority = 50
    store.settings.aiAutomation.modules.map.priority = 90

    const executed = []
    store.registerAiAutomationHandler('chat', async () => {
      executed.push('chat')
      return { ok: true }
    })
    store.registerAiAutomationHandler('map', async () => {
      executed.push('map')
      return { ok: true }
    })

    const now = Date.now()
    expect(
      store.enqueueAiAutomationTask({
        moduleKey: 'chat',
        targetId: 'contact:1',
        dueAt: now,
      }).accepted,
    ).toBe(true)
    expect(
      store.enqueueAiAutomationTask({
        moduleKey: 'map',
        targetId: 'map:auto',
        dueAt: now,
      }).accepted,
    ).toBe(true)

    const first = await store.runAiAutomationQueueTick(now)
    expect(first.handled).toBe(true)
    expect(first.moduleKey).toBe('map')

    const second = await store.runAiAutomationQueueTick(now)
    expect(second.handled).toBe(true)
    expect(second.moduleKey).toBe('chat')

    expect(executed).toEqual(['map', 'chat'])
    expect(store.getAiAutomationQueueSnapshot().length).toBe(0)
  })

  test('dedupes queued tasks by fingerprint window', async () => {
    const store = useSystemStore()
    store.settings.aiAutomation.masterEnabled = true
    store.settings.aiAutomation.modules.chat.enabled = true
    store.registerAiAutomationHandler('chat', async () => ({ ok: true }))

    const now = Date.now()
    const first = store.enqueueAiAutomationTask({
      moduleKey: 'chat',
      targetId: 'contact:2',
      dueAt: now,
      fingerprint: 'chat:contact:2:v1',
    })
    expect(first.accepted).toBe(true)

    const duplicate = store.enqueueAiAutomationTask({
      moduleKey: 'chat',
      targetId: 'contact:2',
      dueAt: now + 1,
      fingerprint: 'chat:contact:2:v1',
    })
    expect(duplicate.accepted).toBe(false)
    expect(duplicate.reason).toBe('deduped')
    expect(store.getAiAutomationQueueSnapshot().length).toBe(1)

    const runResult = await store.runAiAutomationQueueTick(now)
    expect(runResult.handled).toBe(true)

    const afterWindow = store.enqueueAiAutomationTask(
      {
        moduleKey: 'chat',
        targetId: 'contact:2',
        dueAt: now + 200_000,
        fingerprint: 'chat:contact:2:v1',
      },
      {
        baseAt: now + 200_000,
      },
    )
    expect(afterWindow.accepted).toBe(true)
  })

  test('drops queued tasks when module policy becomes disabled', async () => {
    const store = useSystemStore()
    store.settings.aiAutomation.masterEnabled = true
    store.settings.aiAutomation.modules.map.enabled = true

    const now = Date.now()
    const queued = store.enqueueAiAutomationTask({
      moduleKey: 'map',
      targetId: 'map:auto',
      dueAt: now,
    })
    expect(queued.accepted).toBe(true)

    store.settings.aiAutomation.modules.map.enabled = false
    const result = await store.runAiAutomationQueueTick(now)
    expect(result.handled).toBe(false)
    expect(result.reason).toBe('module_disabled')
    expect(store.getAiAutomationQueueSnapshot().length).toBe(0)
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

  test('accepts storage module audit reports for unified diagnostics', () => {
    const store = useSystemStore()

    store.addApiReport({
      level: 'error',
      module: 'storage',
      action: 'audit_storage',
      code: 'STORAGE_MIRROR_DRIFT',
      message: 'Storage audit completed: drift 2, invalid 0.',
      provider: 'local_persistence',
      model: 'store:system,store:chat',
    })

    expect(store.apiReports.length).toBe(1)
    expect(store.apiReports[0].module).toBe('storage')
    expect(store.apiReports[0].action).toBe('audit_storage')
    expect(store.apiReports[0].code).toBe('STORAGE_MIRROR_DRIFT')
  })

  test('supports scoped report clear by module and level', () => {
    const store = useSystemStore()

    store.addApiReport({
      level: 'error',
      module: 'storage',
      action: 'audit_storage',
      code: 'STORAGE_MIRROR_DRIFT',
      message: 'drift',
    })
    store.addApiReport({
      level: 'info',
      module: 'storage',
      action: 'repair_storage',
      code: 'STORAGE_REPAIR_DONE',
      message: 'fixed',
    })
    store.addApiReport({
      level: 'error',
      module: 'network',
      action: 'fetch_models',
      code: 'RATE_LIMIT',
      message: '429',
    })

    const removedStorageErrors = store.clearApiReports({ module: 'storage', level: 'error' })
    expect(removedStorageErrors).toBe(1)
    expect(store.apiReports.some((item) => item.module === 'storage' && item.level === 'error')).toBe(false)
    expect(store.apiReports.some((item) => item.module === 'storage' && item.level === 'info')).toBe(true)

    const removedStorageAll = store.clearApiReports({ module: 'storage' })
    expect(removedStorageAll).toBe(1)
    expect(store.apiReports.some((item) => item.module === 'storage')).toBe(false)
    expect(store.apiReports.some((item) => item.module === 'network')).toBe(true)
  })
})
