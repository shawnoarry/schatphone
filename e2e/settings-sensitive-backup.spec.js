import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { navigateInsideUnlockedApp, unlockToHome } from './helpers/navigation.js'

test.use({
  trace: 'off',
  screenshot: 'off',
  video: 'off',
})

const copy = {
  en: {
    noteTitle: 'Complete backups contain sensitive data',
    noteFragments: [
      'configured API keys and other credentials',
      'chats, characters, and worlds',
      'trusted location',
      'do not share the backup file directly',
    ],
    exportAction: /Backup & Export|Exporting/,
    assetToggle: 'Include asset package in export',
    dialogTitle: 'Export sensitive backup file',
    dialogMessage:
      'This complete backup file contains configured API credentials and private local data such as chats, roles, and world content. Save it only to a trusted location and do not share it directly.',
    confirm: 'I understand, continue download',
    cancel: 'Cancel download',
    feedback: 'Backup download has started.',
  },
  zh: {
    noteTitle: '完整备份包含敏感数据',
    noteFragments: [
      '已配置的 API 密钥和其他凭据',
      '聊天、角色、世界',
      '可信位置',
      '不要直接分享备份文件',
    ],
    exportAction: /备份与导出|正在导出/,
    assetToggle: '导出包含素材包',
    dialogTitle: '导出敏感备份文件',
    dialogMessage:
      '这份完整备份文件包含已配置的 API 凭据，以及聊天、角色、世界等私密本地数据。只应保存到可信位置，不应直接分享。',
    confirm: '我已了解，继续下载',
    cancel: '取消下载',
    feedback: '备份文件下载已开始。',
  },
}

const seedSettings = async (page, { language, theme, apiKey }) => {
  await page.addInitScript(
    ({ currentLanguage, currentTheme, seededApiKey }) => {
      const storageKey = 'schatphone:store:system'
      if (window.localStorage.getItem(storageKey)) return

      window.localStorage.setItem(
        storageKey,
        JSON.stringify({
          version: 1,
          savedAt: Date.now(),
          data: {
            settings: {
              api: {
                key: seededApiKey,
              },
              appearance: {
                currentTheme,
                wallpaperMode: 'theme',
              },
              system: {
                language: currentLanguage,
                notifications: false,
                backupCopyTone: 'direct',
              },
            },
            user: {
              name: currentLanguage === 'zh-CN' ? '备份验收用户' : 'Backup Acceptance User',
            },
          },
        }),
      )
    },
    {
      currentLanguage: language,
      currentTheme: theme,
      seededApiKey: apiKey,
    },
  )
}

const seedChatIdentity = async (page, identity) => {
  await page.addInitScript((seededIdentity) => {
    const storageKey = 'schatphone:store:chat'
    if (window.localStorage.getItem(storageKey)) return
    window.localStorage.setItem(
      storageKey,
      JSON.stringify({
        version: 2,
        savedAt: Date.now(),
        data: {
          moduleAvatarOverrides: {
            selfAvatar: '',
            defaultContactAvatar: 'https://example.com/backup-contact.png',
            contactAvatars: {},
          },
          moduleIdentity: seededIdentity,
          roleProfiles: [],
          contacts: [],
          conversations: {},
          messagesByConversation: {},
        },
      }),
    )
  }, identity)
}

const expectNoHorizontalOverflow = async (page) => {
  const overflow = await page.evaluate(() => {
    const settingsScroll = document.querySelector('.settings-scroll')
    return {
      document: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      body: document.body.scrollWidth - document.body.clientWidth,
      settings:
        settingsScroll instanceof HTMLElement
          ? settingsScroll.scrollWidth - settingsScroll.clientWidth
          : 0,
    }
  })

  expect(overflow.document, 'document should not overflow horizontally').toBeLessThanOrEqual(1)
  expect(overflow.body, 'body should not overflow horizontally').toBeLessThanOrEqual(1)
  expect(overflow.settings, 'Settings content should not overflow horizontally').toBeLessThanOrEqual(
    1,
  )
}

const expectNoCriticalAxeViolations = async (page) => {
  const accessibility = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze()
  const criticalViolations = accessibility.violations.filter(
    (violation) => violation.impact === 'critical',
  )

  expect(criticalViolations).toEqual([])
}

const expectSecretNotRendered = async (page, secret) => {
  const isRendered = await page.locator('body').evaluate(
    (body, value) => body.innerText.includes(value),
    secret,
  )

  expect(isRendered, 'the seeded credential must not appear in visible page text').toBe(false)
}

const readDownloadText = async (download) => {
  const stream = await download.createReadStream()
  const chunks = []

  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }

  return Buffer.concat(chunks).toString('utf8')
}

const readBackupRecoveryEvidence = async (page) =>
  page.evaluate(async () => {
    const chatEnvelope = JSON.parse(window.localStorage.getItem('schatphone:store:chat') || '{}')
    const systemEnvelope = JSON.parse(window.localStorage.getItem('schatphone:store:system') || '{}')
    const journals = await new Promise((resolve, reject) => {
      const request = indexedDB.open('schatphone-repository')
      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        const database = request.result
        const transaction = database.transaction('operation_journal', 'readonly')
        const getAll = transaction.objectStore('operation_journal').getAll()
        getAll.onerror = () => reject(getAll.error)
        getAll.onsuccess = () => {
          database.close()
          resolve(getAll.result)
        }
      }
    })
    return {
      identity: chatEnvelope?.data?.moduleIdentity || null,
      storageReports: (systemEnvelope?.data?.apiReports || []).filter(
        (entry) => entry?.module === 'storage',
      ),
      restoreJournals: journals.filter(
        (entry) => entry?.operationType === 'complete_backup_restore',
      ),
    }
  })

const createRollbackSnapshotFromBackup = (backup) => ({
  system: {
    settings: backup.settings,
    user: backup.user,
    notifications: backup.notifications,
    apiReports: backup.apiReports,
    truthState: backup.truthState,
  },
  chat: {
    moduleAvatarOverrides: backup.moduleAvatarOverrides,
    moduleIdentity: backup.moduleIdentity,
    roleProfiles: backup.roleProfiles,
    contacts: backup.contacts,
    chatHistory: backup.chatHistory,
    conversations: backup.conversations,
    messagesByConversation: backup.messagesByConversation,
  },
  map: backup.map,
  calendar: backup.calendar,
  reminders: backup.reminders,
  gallery: backup.gallery,
  files: backup.files,
  book: backup.book,
  shopping: backup.shopping,
  foodDelivery: backup.foodDelivery,
  simulation: backup.simulation,
  assets: backup.assets,
  wallet: backup.wallet,
  phone: backup.phone,
  stock: backup.stock,
  relationshipRuntime: backup.relationshipRuntime,
  imageGeneration: backup.imageGeneration,
})

test('Settings warns before exporting a complete backup and preserves the configured credential', async ({
  page,
}, testInfo) => {
  const simulatedPhone = testInfo.project.name === 'mobile-chrome'
  const language = simulatedPhone ? 'zh-CN' : 'en-US'
  const theme = simulatedPhone ? 'zen' : 'default'
  const localeCopy = simulatedPhone ? copy.zh : copy.en
  const seededApiKey =
    'credential_' +
    Buffer.from(testInfo.project.name + ':2026-07-22').toString('base64url')
  const pageErrors = []
  let downloadCount = 0

  page.on('pageerror', (error) => pageErrors.push(error.message))
  page.on('download', () => {
    downloadCount += 1
  })

  await page.emulateMedia({ reducedMotion: 'reduce' })
  await seedSettings(page, { language, theme, apiKey: seededApiKey })
  await unlockToHome(page)
  await navigateInsideUnlockedApp(page, '/settings')

  await expect(page.locator('.app-shell')).toHaveAttribute('data-theme', theme)

  const note = page.getByRole('note', { name: localeCopy.noteTitle })
  await expect(note).toBeVisible()
  for (const fragment of localeCopy.noteFragments) {
    await expect(note).toContainText(fragment)
  }

  const assetToggle = page.getByRole('checkbox', { name: localeCopy.assetToggle })
  const exportButton = page.getByRole('button', { name: localeCopy.exportAction })
  await expect(assetToggle).toBeChecked()
  await expect(exportButton).toBeEnabled()
  await expectSecretNotRendered(page, seededApiKey)
  await expectNoHorizontalOverflow(page)
  await expectNoCriticalAxeViolations(page)

  await exportButton.click()

  await expect(page.getByText(localeCopy.dialogTitle, { exact: true })).toBeVisible()
  await expect(page.getByText(localeCopy.dialogMessage, { exact: true })).toBeVisible()
  const cancelButton = page.getByRole('button', { name: localeCopy.cancel, exact: true })
  const confirmButton = page.getByRole('button', { name: localeCopy.confirm, exact: true })
  await expect(cancelButton).toBeVisible()
  await expect(confirmButton).toBeVisible()
  await expect(confirmButton).toHaveClass(/app-dialog-button-danger/)
  await expect(exportButton).toBeDisabled()
  await expectSecretNotRendered(page, seededApiKey)
  await expectNoHorizontalOverflow(page)
  await expectNoCriticalAxeViolations(page)

  await cancelButton.click()

  await expect(page.getByText(localeCopy.dialogTitle, { exact: true })).toHaveCount(0)
  await expect(exportButton).toBeEnabled()
  expect(downloadCount).toBe(0)

  const downloadPromise = page.waitForEvent('download')
  await exportButton.click()
  await expect(page.getByText(localeCopy.dialogTitle, { exact: true })).toBeVisible()
  await page.getByRole('button', { name: localeCopy.confirm, exact: true }).click()
  const download = await downloadPromise
  const downloadedText = await readDownloadText(download)
  const exported = JSON.parse(downloadedText)
  const exportedKeyBytes = Buffer.from(String(exported?.settings?.api?.key || ''), 'utf8')
  const seededKeyBytes = Buffer.from(seededApiKey, 'utf8')

  expect(downloadCount).toBe(1)
  expect(download.suggestedFilename()).toBe('schatphone_backup.json')
  expect(exportedKeyBytes.length).toBe(seededKeyBytes.length)
  expect(
    exportedKeyBytes.equals(seededKeyBytes),
    'the exported credential bytes must equal the seeded credential bytes',
  ).toBe(true)
  expect(exported.backupMeta).toMatchObject({
    magic: 'schatphone-complete-backup',
    schemaVersion: 3,
    exportMode: 'metadata_with_asset_package',
  })
  expect(exported.backupMeta.manifest.sectionCount).toBeGreaterThan(20)
  expect(exported.backupMeta.galleryAssetPackage).toMatchObject({
    requested: true,
    included: true,
  })
  await expect(page.getByText(localeCopy.feedback, { exact: false })).toBeVisible()
  await expect(exportButton).toBeEnabled()
  await expect(assetToggle).toBeChecked()
  await expectSecretNotRendered(page, seededApiKey)
  await expect(
    page.getByRole('button', { name: /redacted|shareable|脱敏|分享版/i }),
  ).toHaveCount(0)
  await expectNoHorizontalOverflow(page)
  expect(pageErrors).toEqual([])
})

test('verified backup restores Chat identity and survives an app reopen', async ({ page }, testInfo) => {
  const packagedIdentity = {
    nickname: `Packaged ${testInfo.project.name}`,
    avatar: 'https://example.com/packaged-self.png',
    anonymityEnabled: true,
    anonymityScope: 'all',
    anonymityContactIds: [],
  }
  await seedSettings(page, {
    language: 'en-US',
    theme: 'default',
    apiKey: `roundtrip_${testInfo.project.name}`,
  })
  await seedChatIdentity(page, packagedIdentity)
  await unlockToHome(page)
  await navigateInsideUnlockedApp(page, '/settings')

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: /Backup & Export|Exporting/ }).click()
  await page.getByRole('button', { name: 'I understand, continue download', exact: true }).click()
  const exportedText = await readDownloadText(await downloadPromise)
  const exported = JSON.parse(exportedText)
  expect(exported.moduleIdentity).toMatchObject(packagedIdentity)

  await navigateInsideUnlockedApp(page, '/chat-me?section=identity')
  const identitySection = page.getByTestId('chat-me-identity-section')
  await identitySection.getByLabel('Avatar URL').fill('https://example.com/current-self.png')
  await identitySection.getByLabel('Chat nickname').fill('Current identity before restore')
  const anonymousMode = identitySection.getByRole('checkbox').first()
  if (await anonymousMode.isChecked()) await anonymousMode.uncheck()
  await identitySection.getByRole('button', { name: 'Save Chat identity', exact: true }).click()
  await expect(page.getByText('Chat identity saved.', { exact: true })).toBeVisible()
  await navigateInsideUnlockedApp(page, '/settings')

  await page.locator('input[type="file"]').setInputFiles({
    name: 'verified-complete-backup.json',
    mimeType: 'application/json',
    buffer: Buffer.from(exportedText, 'utf8'),
  })
  await page.getByRole('button', { name: 'Continue import', exact: true }).click()
  const importButton = page.getByRole('button', { name: /Importing|Restore Import/ })
  await expect(importButton).toContainText('Importing...')
  await expect(importButton).toContainText('Restore Import (JSON)')
  const imported = await readBackupRecoveryEvidence(page)
  expect(imported.storageReports[0], JSON.stringify(imported, null, 2)).toMatchObject({
    action: 'import_backup',
    code: 'BACKUP_IMPORT_WITH_ASSET_PACKAGE',
  })
  await expect(page.getByText(/Import succeeded and data has been restored/)).toBeVisible()

  await page.reload()
  await unlockToHome(page)
  const reopened = await readBackupRecoveryEvidence(page)

  expect(reopened.identity).toMatchObject(packagedIdentity)
  expect(reopened.restoreJournals.at(-1)).toMatchObject({
    phase: 'completed',
    recoveryAction: 'backup_restore_committed_and_reopened',
  })
})

test('unfinished backup restore rolls back before the app reopens', async ({ page }, testInfo) => {
  const previousIdentity = {
    nickname: `Previous ${testInfo.project.name}`,
    avatar: 'https://example.com/previous-self.png',
    anonymityEnabled: true,
    anonymityScope: 'all',
    anonymityContactIds: [],
  }
  await seedSettings(page, {
    language: 'en-US',
    theme: 'default',
    apiKey: `crash_recovery_${testInfo.project.name}`,
  })
  await seedChatIdentity(page, previousIdentity)
  await unlockToHome(page)
  await navigateInsideUnlockedApp(page, '/settings')

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: /Backup & Export|Exporting/ }).click()
  await page.getByRole('button', { name: 'I understand, continue download', exact: true }).click()
  const exported = JSON.parse(await readDownloadText(await downloadPromise))
  const rollbackSnapshot = createRollbackSnapshotFromBackup(exported)

  await page.evaluate(async (snapshot) => {
    const { stageBackupRestoreCheckpoint } = await import(
      '/schatphone/src/lib/backup-restore-checkpoint.js'
    )
    const checkpoint = await stageBackupRestoreCheckpoint(snapshot)
    checkpoint.repository.close()
  }, rollbackSnapshot)

  await navigateInsideUnlockedApp(page, '/chat-me?section=identity')
  const identitySection = page.getByTestId('chat-me-identity-section')
  await identitySection.getByLabel('Avatar URL').fill('https://example.com/interrupted-self.png')
  await identitySection.getByLabel('Chat nickname').fill('Interrupted restore state')
  const anonymousMode = identitySection.getByRole('checkbox').first()
  if (await anonymousMode.isChecked()) await anonymousMode.uncheck()
  await identitySection.getByRole('button', { name: 'Save Chat identity', exact: true }).click()
  await expect(page.getByText('Chat identity saved.', { exact: true })).toBeVisible()

  const interrupted = await readBackupRecoveryEvidence(page)
  expect(interrupted.identity.nickname).toBe('Interrupted restore state')
  expect(interrupted.restoreJournals.at(-1)).toMatchObject({ phase: 'external_applying' })

  await page.reload()
  await unlockToHome(page)
  const recovered = await readBackupRecoveryEvidence(page)

  expect(recovered.identity).toMatchObject(previousIdentity)
  expect(recovered.restoreJournals.at(-1)).toMatchObject({
    phase: 'completed',
    recoveryAction: 'crash_recovery_previous_save_restored',
  })
})
