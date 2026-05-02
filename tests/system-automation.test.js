import { beforeEach, describe, expect, test, vi } from 'vitest'
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
    expect(store.tryAcquireAutoExecution('chat', 'contact:1:retry')).toBe(false)

    expect(store.releaseAutoExecution('map')).toBe(false)
    expect(store.releaseAutoExecution('chat')).toBe(true)
    expect(store.activeAutoExecution.module).toBe('')
  })

  test('prevents same-module queue reentry while a handler is still running', async () => {
    const store = useSystemStore()
    store.settings.aiAutomation.masterEnabled = true
    store.settings.aiAutomation.modules.chat.enabled = true

    let firstInvocationPending = true
    let releaseHandler = () => {}
    const runningHandler = vi.fn(
      () => {
        if (!firstInvocationPending) {
          return Promise.resolve({ ok: true })
        }
        return new Promise((resolve) => {
          releaseHandler = () => {
            firstInvocationPending = false
            resolve({ ok: true })
          }
        })
      },
    )

    store.registerAiAutomationHandler('chat', runningHandler)

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
        moduleKey: 'chat',
        targetId: 'contact:2',
        dueAt: now,
      }).accepted,
    ).toBe(true)

    const firstRunPromise = store.runAiAutomationQueueTick(now)
    await Promise.resolve()

    const secondRun = await store.runAiAutomationQueueTick(now)
    expect(secondRun.handled).toBe(false)
    expect(secondRun.reason).toBe('lock_busy')
    expect(secondRun.moduleKey).toBe('chat')
    expect(runningHandler).toHaveBeenCalledTimes(1)

    releaseHandler()
    const firstRun = await firstRunPromise
    expect(firstRun.handled).toBe(true)
    expect(firstRun.moduleKey).toBe('chat')

    const thirdRun = await store.runAiAutomationQueueTick(now + 30_000)
    expect(thirdRun.handled).toBe(true)
    expect(runningHandler).toHaveBeenCalledTimes(2)
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

  test('defers handler-missing tasks so later modules can continue', async () => {
    const store = useSystemStore()
    store.settings.aiAutomation.masterEnabled = true
    store.settings.aiAutomation.modules.chat.enabled = true
    store.settings.aiAutomation.modules.map.enabled = true
    store.settings.aiAutomation.modules.chat.priority = 100
    store.settings.aiAutomation.modules.map.priority = 10

    const handledModules = []
    store.registerAiAutomationHandler('map', async () => {
      handledModules.push('map')
      return { ok: true }
    })

    const now = Date.now()
    const queuedChat = store.enqueueAiAutomationTask({
      moduleKey: 'chat',
      targetId: 'contact:9',
      dueAt: now,
    })
    const queuedMap = store.enqueueAiAutomationTask({
      moduleKey: 'map',
      targetId: 'map:auto',
      dueAt: now,
    })

    expect(queuedChat.accepted).toBe(true)
    expect(queuedMap.accepted).toBe(true)

    const first = await store.runAiAutomationQueueTick(now)
    expect(first.handled).toBe(false)
    expect(first.reason).toBe('handler_missing_deferred')
    expect(first.queueAdvanced).toBe(true)

    const deferredChat = store.getAiAutomationQueueSnapshot({ moduleKey: 'chat' })[0]
    expect(deferredChat?.dueAt).toBeGreaterThan(now)

    const second = await store.runAiAutomationQueueTick(now)
    expect(second.handled).toBe(true)
    expect(second.moduleKey).toBe('map')
    expect(handledModules).toEqual(['map'])
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

  test('accepts push module reports for unified diagnostics', () => {
    const store = useSystemStore()

    store.addApiReport({
      level: 'error',
      module: 'push',
      action: 'resync',
      code: 'subscription_not_found',
      message: 'Push subscription record missing on server.',
    })

    expect(store.apiReports.length).toBe(1)
    expect(store.apiReports[0].module).toBe('push')
    expect(store.apiReports[0].action).toBe('resync')
    expect(store.apiReports[0].code).toBe('subscription_not_found')
  })

  test('normalizes push runtime state through setPushState', () => {
    const store = useSystemStore()

    store.setPushState({
      realPushEnabled: true,
      pushDisplayMode: 'preview',
      pushServerUrl: 'http://localhost:8787/',
      pushPermission: 'granted',
      pushDeviceId: ' device-1 ',
      pushSubscriptionActive: true,
      pushLastSyncedAt: 1234.8,
      pushLastError: ' subscription failed ',
      pushVapidPublicKey: ' key ',
    })

    expect(store.settings.system.realPushEnabled).toBe(true)
    expect(store.settings.system.pushDisplayMode).toBe('preview')
    expect(store.settings.system.pushServerUrl).toBe('http://localhost:8787')
    expect(store.settings.system.pushPermission).toBe('granted')
    expect(store.settings.system.pushDeviceId).toBe('device-1')
    expect(store.settings.system.pushSubscriptionActive).toBe(true)
    expect(store.settings.system.pushLastSyncedAt).toBe(1234)
    expect(store.settings.system.pushLastError).toBe('subscription failed')
    expect(store.settings.system.pushVapidPublicKey).toBe('key')
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

  test('hydrates api defaults from env when no persisted snapshot exists', async () => {
    vi.resetModules()
    vi.stubEnv('VITE_API_URL', 'https://generativelanguage.googleapis.com/v1beta/models')
    vi.stubEnv('VITE_API_KEY', 'env-key-123')
    vi.stubEnv('VITE_API_MODEL', 'gemini-2.5-flash')

    setActivePinia(createPinia())
    const { useSystemStore: useFreshSystemStore } = await import('../src/stores/system')
    const store = useFreshSystemStore()

    expect(store.settings.api.url).toBe('https://generativelanguage.googleapis.com/v1beta/models')
    expect(store.settings.api.key).toBe('env-key-123')
    expect(store.settings.api.model).toBe('gemini-2.5-flash')
    expect(store.settings.api.resolvedKind).toBe('gemini')

    vi.unstubAllEnvs()
  })
})
