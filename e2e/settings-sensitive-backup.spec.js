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
  await expect(assetToggle).not.toBeChecked()
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
    schemaVersion: 2,
    exportMode: 'metadata_only',
  })
  expect(exported.backupMeta.galleryAssetPackage).toMatchObject({
    requested: false,
    included: false,
  })
  await expect(page.getByText(localeCopy.feedback, { exact: false })).toBeVisible()
  await expect(exportButton).toBeEnabled()
  await expect(assetToggle).not.toBeChecked()
  await expectSecretNotRendered(page, seededApiKey)
  await expect(
    page.getByRole('button', { name: /redacted|shareable|脱敏|分享版/i }),
  ).toHaveCount(0)
  await expectNoHorizontalOverflow(page)
  expect(pageErrors).toEqual([])
})
