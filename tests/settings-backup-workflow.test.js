import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useSettingsBackupWorkflow } from '../src/composables/useSettingsBackupWorkflow'
import { useChatStore } from '../src/stores/chat'
import { useSystemStore } from '../src/stores/system'
import { useImageGenerationStore } from '../src/stores/imageGeneration'

const t = (zh, en) => en || zh

const installDownloadHarness = () => {
  const blobConstructor = vi.fn()
  const createObjectURL = vi.fn(() => 'blob:settings-backup')
  const revokeObjectURL = vi.fn()
  vi.stubGlobal(
    'Blob',
    class TestBlob {
      constructor(parts = [], options = {}) {
        blobConstructor(parts, options)
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

  return {
    blobConstructor,
    createObjectURL,
    revokeObjectURL,
    clickSpy,
  }
}

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
    const imageGenerationStore = useImageGenerationStore()
    systemStore.settings.system.language = 'en-US'
    systemStore.settings.api.key = 'seeded-api-key'
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
    imageGenerationStore.setCredentials(imageGenerationStore.profiles[0].id, {
      apiKey: 'image-secret',
      proxyToken: 'proxy-secret',
    })
    imageGenerationStore.updateDefaults({ aspectRatio: '4:5' })
    imageGenerationStore.addCandidates({
      imageUrls: ['https://example.com/temporary-candidate.png'],
      request: { prompt: 'temporary candidate' },
      profile: imageGenerationStore.profiles[0],
    })

    const { createObjectURL, revokeObjectURL, clickSpy } = installDownloadHarness()
    const confirmDialog = vi.fn(async () => true)

    const workflow = useSettingsBackupWorkflow({
      systemStore,
      chatStore,
      t,
      confirmDialog,
    })

    expect(workflow.backupExportModeLabel.value).toContain('metadata only')

    await workflow.exportData()

    expect(createObjectURL).toHaveBeenCalledTimes(1)
    const exportedBlob = createObjectURL.mock.calls[0][0]
    const exported = JSON.parse(exportedBlob.parts.join(''))
    expect(Object.keys(exported)).toEqual([
      'backupMeta',
      'settings',
      'user',
      'notifications',
      'apiReports',
      'truthState',
      'roleProfiles',
      'contacts',
      'chatHistory',
      'conversations',
      'messagesByConversation',
      'map',
      'calendar',
      'reminders',
      'gallery',
      'files',
      'book',
      'shopping',
      'foodDelivery',
      'simulation',
      'assets',
      'wallet',
      'phone',
      'stock',
      'relationshipRuntime',
      'imageGeneration',
    ])
    expect(exported.backupMeta).toMatchObject({
      schemaVersion: 2,
      exportMode: 'metadata_only',
    })
    expect(exported.backupMeta.galleryAssetPackage).toMatchObject({
      requested: false,
      included: false,
    })
    expect(exported.settings.api.key).toBe('seeded-api-key')
    expect(exported.imageGeneration.defaults.aspectRatio).toBe('4:5')
    expect(JSON.stringify(exported.imageGeneration)).not.toContain('image-secret')
    expect(JSON.stringify(exported.imageGeneration)).not.toContain('proxy-secret')
    expect(JSON.stringify(exported.imageGeneration)).not.toContain('temporary-candidate')
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
    expect(confirmDialog).toHaveBeenCalledTimes(1)
    expect(confirmDialog).toHaveBeenCalledWith({
      title: 'Export sensitive backup file',
      message:
        'This complete backup file contains configured API credentials and private local data such as chats, roles, and world content. Save it only to a trusted location and do not share it directly.',
      confirmText: 'I understand, continue download',
      cancelText: 'Cancel download',
      tone: 'danger',
    })
    expect(confirmDialog.mock.invocationCallOrder[0]).toBeLessThan(
      createObjectURL.mock.invocationCallOrder[0],
    )

    clickSpy.mockRestore()
  })

  test('cancels a sensitive export before payload, Blob, download, reports, or success state', async () => {
    const systemStore = useSystemStore()
    const chatStore = useChatStore()
    const createBackupSnapshotAsync = vi.fn()
    const markBackupExported = vi.spyOn(systemStore, 'markBackupExported')
    const saveNow = vi.spyOn(systemStore, 'saveNow')
    const { blobConstructor, createObjectURL, revokeObjectURL, clickSpy } =
      installDownloadHarness()
    const confirmDialog = vi.fn(async () => false)
    const workflow = useSettingsBackupWorkflow({
      systemStore,
      chatStore,
      galleryStore: { createBackupSnapshotAsync },
      t,
      confirmDialog,
    })

    await workflow.exportData()

    expect(confirmDialog).toHaveBeenCalledTimes(1)
    expect(createBackupSnapshotAsync).not.toHaveBeenCalled()
    expect(blobConstructor).not.toHaveBeenCalled()
    expect(createObjectURL).not.toHaveBeenCalled()
    expect(revokeObjectURL).not.toHaveBeenCalled()
    expect(clickSpy).not.toHaveBeenCalled()
    expect(markBackupExported).not.toHaveBeenCalled()
    expect(saveNow).not.toHaveBeenCalled()
    expect(systemStore.apiReports).toEqual([])
    expect(workflow.backupFeedbackType.value).toBe('')
    expect(workflow.backupFeedbackMessage.value).toBe('')
    expect(workflow.backupExporting.value).toBe(false)
  })

  test('uses the same sensitive warning for direct and immersive copy tones', async () => {
    const systemStore = useSystemStore()
    const chatStore = useChatStore()
    const confirmDialog = vi.fn(async () => false)
    const workflow = useSettingsBackupWorkflow({ systemStore, chatStore, t, confirmDialog })

    workflow.setBackupCopyTone('direct')
    await workflow.exportData()
    const directWarning = confirmDialog.mock.calls[0][0]

    workflow.setBackupCopyTone('immersive')
    await workflow.exportData()
    const immersiveWarning = confirmDialog.mock.calls[1][0]

    expect(immersiveWarning).toEqual(directWarning)
    expect(directWarning.title).toContain('sensitive')
    expect(directWarning.message).toContain('configured API credentials')
    expect(directWarning.message).toContain('chats, roles, and world content')
    expect(directWarning.message).toContain('trusted location')
    expect(directWarning.message).toContain('do not share it directly')
    expect(directWarning.confirmText).toBe('I understand, continue download')
    expect(directWarning.cancelText).toBe('Cancel download')
    expect(directWarning.tone).toBe('danger')
  })

  test('keeps one confirmation in flight when export is triggered twice', async () => {
    const systemStore = useSystemStore()
    const chatStore = useChatStore()
    let resolveConfirmation = () => {}
    const confirmDialog = vi.fn(
      () =>
        new Promise((resolve) => {
          resolveConfirmation = resolve
        }),
    )
    const workflow = useSettingsBackupWorkflow({ systemStore, chatStore, t, confirmDialog })

    const firstExport = workflow.exportData()
    const duplicateExport = workflow.exportData()

    expect(confirmDialog).toHaveBeenCalledTimes(1)
    expect(workflow.backupExporting.value).toBe(true)

    resolveConfirmation(false)
    await Promise.all([firstExport, duplicateExport])

    expect(confirmDialog).toHaveBeenCalledTimes(1)
    expect(workflow.backupExporting.value).toBe(false)
  })

  test('preserves confirmed whole-asset-package export metadata and reporting', async () => {
    const systemStore = useSystemStore()
    const chatStore = useChatStore()
    const { createObjectURL } = installDownloadHarness()
    const workflow = useSettingsBackupWorkflow({
      systemStore,
      chatStore,
      t,
      confirmDialog: vi.fn(async () => true),
    })
    workflow.setBackupIncludeAssetPackage(true)

    await workflow.exportData()

    const exportedBlob = createObjectURL.mock.calls[0][0]
    const exported = JSON.parse(exportedBlob.parts.join(''))
    expect(exported.backupMeta).toMatchObject({
      schemaVersion: 2,
      exportMode: 'metadata_with_asset_package',
    })
    expect(exported.backupMeta.galleryAssetPackage).toMatchObject({
      requested: true,
      included: true,
    })
    expect(systemStore.apiReports[0]).toMatchObject({
      action: 'export_backup',
      code: 'BACKUP_EXPORT_WITH_ASSET_PACKAGE',
      model: 'metadata_with_asset_package',
    })
  })

  test('blocks export when a required legacy v2 shape section is missing', async () => {
    const systemStore = useSystemStore()
    const chatStore = useChatStore()
    const createObjectURL = vi.fn()
    Object.defineProperty(window.URL, 'createObjectURL', {
      value: createObjectURL,
      configurable: true,
    })

    const confirmDialog = vi.fn(async () => true)
    const createBackupSnapshot = vi.fn(() => undefined)
    const workflow = useSettingsBackupWorkflow({
      systemStore,
      chatStore,
      bookStore: {
        createBackupSnapshot,
      },
      t,
      confirmDialog,
    })

    await workflow.exportData()

    expect(createObjectURL).not.toHaveBeenCalled()
    expect(confirmDialog).toHaveBeenCalledTimes(1)
    expect(confirmDialog.mock.invocationCallOrder[0]).toBeLessThan(
      createBackupSnapshot.mock.invocationCallOrder[0],
    )
    expect(workflow.backupFeedbackType.value).toBe('error')
    expect(workflow.backupFeedbackMessage.value).toContain(
      'Legacy v2 backup payload shape is missing or invalid',
    )
    expect(systemStore.apiReports[0]).toMatchObject({
      module: 'storage',
      action: 'export_backup',
      code: 'BACKUP_EXPORT_FAILED',
    })
  })

  test('imports public image configuration without replacing device credentials or candidates', async () => {
    const systemStore = useSystemStore()
    const chatStore = useChatStore()
    const imageGenerationStore = useImageGenerationStore()
    const profileId = imageGenerationStore.profiles[0].id
    imageGenerationStore.setCredentials(profileId, { apiKey: 'device-secret' })
    imageGenerationStore.updateDefaults({ aspectRatio: '4:5' })
    imageGenerationStore.addCandidates({
      imageUrls: ['https://example.com/local-candidate.png'],
      request: { prompt: 'local candidate' },
      profile: imageGenerationStore.profiles[0],
    })

    const { createObjectURL } = installDownloadHarness()
    const workflow = useSettingsBackupWorkflow({
      systemStore,
      chatStore,
      imageGenerationStore,
      t,
      confirmDialog: vi.fn(async () => true),
    })
    await workflow.exportData()
    const exported = JSON.parse(createObjectURL.mock.calls[0][0].parts.join(''))
    imageGenerationStore.updateDefaults({ aspectRatio: '1:1' })

    await workflow.importData({
      target: {
        files: [{ name: 'camera-public-config.json', text: vi.fn(async () => JSON.stringify(exported)) }],
        value: 'camera-public-config.json',
      },
    })

    expect(imageGenerationStore.defaults.aspectRatio).toBe('4:5')
    expect(imageGenerationStore.getCredentials(profileId).apiKey).toBe('device-secret')
    expect(imageGenerationStore.recentCandidates[0].imageUrl).toBe(
      'https://example.com/local-candidate.png',
    )

    const legacyWithoutImageConfig = { ...exported }
    delete legacyWithoutImageConfig.imageGeneration
    imageGenerationStore.updateDefaults({ aspectRatio: '3:2' })
    await workflow.importData({
      target: {
        files: [{ name: 'older-v2.json', text: vi.fn(async () => JSON.stringify(legacyWithoutImageConfig)) }],
        value: 'older-v2.json',
      },
    })
    expect(imageGenerationStore.defaults.aspectRatio).toBe('3:2')
  })
})
