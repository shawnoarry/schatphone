import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useSettingsBackupWorkflow } from '../src/composables/useSettingsBackupWorkflow'
import { useChatStore } from '../src/stores/chat'
import { useSystemStore } from '../src/stores/system'

const t = (zh, en) => en || zh

describe('Settings backup workflow interface', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-19T08:00:00.000Z'))
    setActivePinia(createPinia())
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  test('exports the existing metadata backup shape and writes a storage report', async () => {
    const systemStore = useSystemStore()
    const chatStore = useChatStore()
    systemStore.settings.system.language = 'en-US'
    systemStore.addApiReport({
      level: 'error',
      module: 'storage',
      action: 'audit_storage',
      code: 'PRE_EXISTING_REPORT',
      message: 'Seeded storage report',
      createdAt: Date.now(),
    })
    const profile = chatStore.addRoleProfile({
      roleId: '901A',
      name: 'Backup Role',
      role: 'Archivist',
    })

    const createObjectURL = vi.fn(() => 'blob:settings-backup')
    const revokeObjectURL = vi.fn()
    vi.stubGlobal(
      'Blob',
      class TestBlob {
        constructor(parts = [], options = {}) {
          this.parts = parts
          this.type = options.type || ''
        }
      },
    )
    Object.defineProperty(window.URL, 'createObjectURL', {
      value: createObjectURL,
      configurable: true,
    })
    Object.defineProperty(window.URL, 'revokeObjectURL', {
      value: revokeObjectURL,
      configurable: true,
    })
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

    const workflow = useSettingsBackupWorkflow({
      systemStore,
      chatStore,
      t,
      confirmDialog: vi.fn(async () => true),
    })

    expect(workflow.backupExportModeLabel.value).toContain('metadata only')

    await workflow.exportData()

    expect(createObjectURL).toHaveBeenCalledTimes(1)
    const exportedBlob = createObjectURL.mock.calls[0][0]
    const exported = JSON.parse(exportedBlob.parts.join(''))
    expect(exported.backupMeta).toMatchObject({
      schemaVersion: 2,
      exportMode: 'metadata_only',
    })
    expect(exported.backupMeta.galleryAssetPackage).toMatchObject({
      requested: false,
      included: false,
    })
    expect(exported.roleProfiles).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: profile.id,
          roleId: '901A',
          name: 'Backup Role',
        }),
      ]),
    )
    expect(exported.apiReports).toEqual([
      expect.objectContaining({
        code: 'PRE_EXISTING_REPORT',
      }),
    ])
    expect(clickSpy).toHaveBeenCalledTimes(1)
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:settings-backup')
    expect(workflow.backupFeedbackType.value).toBe('success')
    expect(workflow.backupFeedbackMessage.value).toContain('Backup download has started')
    expect(systemStore.apiReports[0]).toMatchObject({
      module: 'storage',
      action: 'export_backup',
      code: 'BACKUP_EXPORT_METADATA_ONLY',
      model: 'metadata_only',
    })
    expect(systemStore.apiReports[1]).toMatchObject({
      code: 'PRE_EXISTING_REPORT',
    })

    clickSpy.mockRestore()
  })
})
