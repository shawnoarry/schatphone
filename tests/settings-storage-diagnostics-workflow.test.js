import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useSettingsStorageDiagnosticsWorkflow } from '../src/composables/useSettingsStorageDiagnosticsWorkflow'
import { useSystemStore } from '../src/stores/system'

const t = (zh, en) => en || zh

const healthyLayer = () => ({
  exists: true,
  decodedOk: true,
})

describe('Settings storage diagnostics workflow interface', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-19T09:00:00.000Z'))
    setActivePinia(createPinia())
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  test('audits storage targets and writes the storage health report through the interface', async () => {
    const systemStore = useSystemStore()
    const inspectPersistedStateLayers = vi.fn(async (key) => ({
      key,
      fullKey: `schatphone:${key}`,
      mirrorApplicable: true,
      mirrorInSync: true,
      recommendedSource: 'local',
      local: healthyLayer(),
      indexeddb: healthyLayer(),
      issueCode: '',
    }))

    const workflow = useSettingsStorageDiagnosticsWorkflow({
      systemStore,
      t,
      confirmDialog: vi.fn(async () => true),
      getPersistenceCapabilities: () => ({ localStorageAvailable: true }),
      inspectPersistedStateLayers,
      reconcilePersistedStateLayers: vi.fn(),
    })

    await workflow.runStorageAudit()

    expect(inspectPersistedStateLayers).toHaveBeenCalledTimes(15)
    expect(workflow.storageAuditResults.value).toHaveLength(15)
    expect(workflow.storageAuditAt.value).toBe(Date.parse('2026-06-19T09:00:00.000Z'))
    expect(workflow.storageAuditFeedbackType.value).toBe('success')
    expect(workflow.storageAuditFeedbackMessage.value).toContain('storage state is healthy')
    expect(systemStore.apiReports[0]).toMatchObject({
      level: 'info',
      module: 'storage',
      action: 'audit_storage',
      provider: 'local_persistence',
      code: 'STORAGE_HEALTHY',
      message: 'Storage audit completed: layers are aligned and readable.',
      model: '',
    })

    workflow.disposeStorageDiagnosticsWorkflow()
  })

  test('reports drift and repairs audited targets without recording a second audit report', async () => {
    const systemStore = useSystemStore()
    const inspectPersistedStateLayers = vi.fn(async (key) => ({
      key,
      fullKey: `schatphone:${key}`,
      mirrorApplicable: true,
      mirrorInSync: key !== 'store:chat',
      recommendedSource: key === 'store:chat' ? 'indexeddb' : 'local',
      local: healthyLayer(),
      indexeddb: healthyLayer(),
      issueCode: key === 'store:chat' ? 'mirror_drift' : '',
    }))
    const reconcilePersistedStateLayers = vi.fn(async (key) => ({
      ok: true,
      action: key === 'store:chat' ? 'repaired' : 'noop',
    }))

    const workflow = useSettingsStorageDiagnosticsWorkflow({
      systemStore,
      t,
      confirmDialog: vi.fn(async () => true),
      inspectPersistedStateLayers,
      reconcilePersistedStateLayers,
      getPersistenceCapabilities: () => ({ localStorageAvailable: true }),
    })

    await workflow.runStorageAudit()
    expect(systemStore.apiReports[0]).toMatchObject({
      level: 'error',
      code: 'STORAGE_MIRROR_DRIFT',
      model: 'store:chat',
    })
    expect(workflow.storageAuditFeedbackType.value).toBe('warn')

    await workflow.repairStorageDrift()

    expect(reconcilePersistedStateLayers).toHaveBeenCalledTimes(15)
    expect(reconcilePersistedStateLayers).toHaveBeenCalledWith('store:chat', {
      version: 2,
      strategy: 'newest_valid',
    })
    expect(systemStore.apiReports[0]).toMatchObject({
      level: 'info',
      module: 'storage',
      action: 'repair_storage',
      code: 'STORAGE_REPAIR_DONE',
      model: expect.stringContaining('store:chat'),
    })
    expect(systemStore.apiReports.filter((report) => report.action === 'audit_storage')).toHaveLength(1)
    expect(workflow.storageAuditFeedbackType.value).toBe('success')
    expect(workflow.storageAuditFeedbackMessage.value).toContain('1 storage drift item')

    workflow.disposeStorageDiagnosticsWorkflow()
  })

  test('clears only storage reports after confirmation and keeps feedback timer scoped', async () => {
    const systemStore = useSystemStore()
    const confirmDialog = vi.fn(async () => true)
    systemStore.addApiReport({
      level: 'error',
      module: 'storage',
      action: 'audit_storage',
      code: 'STORAGE_MIRROR_DRIFT',
      message: 'Drift',
      createdAt: Date.now(),
    })
    systemStore.addApiReport({
      level: 'error',
      module: 'chat',
      action: 'ai_reply',
      code: 'CHAT_ERROR',
      message: 'Chat error',
      createdAt: Date.now(),
    })

    const workflow = useSettingsStorageDiagnosticsWorkflow({
      systemStore,
      t,
      confirmDialog,
      getPersistenceCapabilities: () => ({}),
      inspectPersistedStateLayers: vi.fn(),
      reconcilePersistedStateLayers: vi.fn(),
    })

    await workflow.clearStorageReports()

    expect(confirmDialog).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Clear storage reports',
      tone: 'danger',
    }))
    expect(systemStore.apiReports).toEqual([
      expect.objectContaining({
        module: 'chat',
        code: 'CHAT_ERROR',
      }),
    ])
    expect(workflow.storageAuditFeedbackType.value).toBe('success')
    expect(workflow.storageAuditFeedbackMessage.value).toContain('Cleared 1 storage report')

    vi.advanceTimersByTime(2200)

    expect(workflow.storageAuditFeedbackType.value).toBe('')
    expect(workflow.storageAuditFeedbackMessage.value).toBe('')

    workflow.disposeStorageDiagnosticsWorkflow()
  })
})
