import { expect, test } from '@playwright/test'
import { navigateInsideUnlockedApp, unlockToHome } from './helpers/navigation.js'

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:5183/schatphone/'
const expectedCommit = process.env.SCHATPHONE_EXPECTED_COMMIT || 'local'
const expectedBasePath = '/schatphone/'

test.describe.configure({ mode: 'serial' })

const waitForExactRelease = async (request) => {
  const releaseUrl = new URL('release.json', baseURL)

  await expect
    .poll(
      async () => {
        const response = await request.get(`${releaseUrl.href}?proof=${Date.now()}`, {
          headers: { 'cache-control': 'no-cache' },
        })
        if (!response.ok()) return { status: response.status() }
        return response.json()
      },
      {
        message: `hosted release must identify exact commit ${expectedCommit}`,
        timeout: 120_000,
        intervals: [1_000, 2_000, 5_000, 10_000],
      },
    )
    .toMatchObject({ schemaVersion: 1, commit: expectedCommit })
}

const readDownloadText = async (download) => {
  const stream = await download.createReadStream()
  const chunks = []
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }
  return Buffer.concat(chunks).toString('utf8')
}

const createSeededStorageState = (projectName) => {
  const identity = {
    nickname: `Hosted recovery ${projectName}`,
    avatar: 'https://example.com/hosted-recovery-self.png',
    anonymityEnabled: true,
    anonymityScope: 'all',
    anonymityContactIds: [],
  }
  const apiKey = `hosted_recovery_${projectName}_credential`
  const origin = new URL(baseURL).origin

  return {
    identity,
    apiKey,
    storageState: {
      cookies: [],
      origins: [
        {
          origin,
          localStorage: [
            {
              name: 'schatphone:store:system',
              value: JSON.stringify({
                version: 1,
                savedAt: Date.now(),
                data: {
                  settings: {
                    api: { key: apiKey },
                    appearance: { currentTheme: 'default', wallpaperMode: 'theme' },
                    system: { language: 'en-US', notifications: false },
                  },
                  user: { name: `Hosted Owner ${projectName}` },
                },
              }),
            },
            {
              name: 'schatphone:store:chat',
              value: JSON.stringify({
                version: 2,
                savedAt: Date.now(),
                data: {
                  moduleAvatarOverrides: {
                    selfAvatar: '',
                    defaultContactAvatar: 'https://example.com/hosted-contact.png',
                    contactAvatars: {},
                  },
                  moduleIdentity: identity,
                  roleProfiles: [],
                  contacts: [],
                  conversations: {},
                  messagesByConversation: {},
                },
              }),
            },
          ],
        },
      ],
    },
  }
}

const readReopenedRecoveryEvidence = async (page) =>
  page.evaluate(async () => {
    const systemEnvelope = JSON.parse(window.localStorage.getItem('schatphone:store:system') || '{}')
    const chatEnvelope = JSON.parse(window.localStorage.getItem('schatphone:store:chat') || '{}')
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
      userName: systemEnvelope?.data?.user?.name || '',
      apiKey: systemEnvelope?.data?.settings?.api?.key || '',
      identity: chatEnvelope?.data?.moduleIdentity || null,
      restoreJournal: journals
        .filter((entry) => entry?.operationType === 'complete_backup_restore')
        .at(-1),
    }
  })

test('deployed base path, manifest, service worker, and cached shell survive offline reopen', async ({
  page,
  context,
  request,
}) => {
  const pageErrors = []
  page.on('pageerror', (error) => pageErrors.push(error.message))

  await waitForExactRelease(request)
  await page.goto(baseURL, { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.app-shell')).toBeVisible()

  const manifestHref = await page.locator('link[rel="manifest"]').getAttribute('href')
  expect(manifestHref).toBeTruthy()
  const manifestUrl = new URL(manifestHref, page.url())
  expect(manifestUrl.pathname).toBe(`${expectedBasePath}manifest.webmanifest`)

  const manifestResponse = await page.request.get(manifestUrl.href)
  expect(manifestResponse.ok()).toBe(true)
  const manifest = await manifestResponse.json()
  const resolvedId = new URL(manifest.id, manifestUrl)
  const resolvedStartUrl = new URL(manifest.start_url, manifestUrl)
  const resolvedScope = new URL(manifest.scope, manifestUrl)

  expect(resolvedId.pathname).toBe(expectedBasePath)
  expect(resolvedStartUrl.pathname).toBe(expectedBasePath)
  expect(resolvedStartUrl.hash).toBe('#/lock')
  expect(resolvedScope.pathname).toBe(expectedBasePath)
  expect(manifest.display).toBe('standalone')
  expect(manifest.icons).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ sizes: '192x192', type: 'image/png', purpose: 'any' }),
      expect.objectContaining({ sizes: '512x512', type: 'image/png', purpose: 'any' }),
      expect.objectContaining({ sizes: '512x512', type: 'image/png', purpose: 'maskable' }),
    ]),
  )
  for (const icon of manifest.icons) {
    const iconUrl = new URL(icon.src, manifestUrl)
    expect(iconUrl.pathname.startsWith(`${expectedBasePath}icons/`)).toBe(true)
    expect((await page.request.get(iconUrl.href)).ok()).toBe(true)
  }

  await page.evaluate(() => navigator.serviceWorker.ready)
  await page.reload({ waitUntil: 'domcontentloaded' })
  await expect(page.locator('.app-shell')).toBeVisible()

  const serviceWorkerEvidence = await page.evaluate(() => ({
    controllerUrl: navigator.serviceWorker.controller?.scriptURL || '',
    cacheNames: [],
  }))
  serviceWorkerEvidence.cacheNames = await page.evaluate(() => caches.keys())
  expect(new URL(serviceWorkerEvidence.controllerUrl).pathname).toBe(
    `${expectedBasePath}service-worker.js`,
  )
  expect(serviceWorkerEvidence.cacheNames.some((name) => name.startsWith('schatphone-pwa-'))).toBe(
    true,
  )

  const cdp = await context.newCDPSession(page)
  const appManifest = await cdp.send('Page.getAppManifest')
  expect(appManifest.errors).toEqual([])
  const installability = await cdp.send('Page.getInstallabilityErrors')
  const environmentOnlyErrors = installability.installabilityErrors.filter(
    (error) => error.errorId === 'in-incognito',
  )
  const productInstallabilityErrors = installability.installabilityErrors.filter(
    (error) => error.errorId !== 'in-incognito',
  )
  expect(environmentOnlyErrors).toHaveLength(1)
  expect(productInstallabilityErrors).toEqual([])

  await context.setOffline(true)
  try {
    await page.reload({ waitUntil: 'domcontentloaded' })
    await expect(page.locator('.app-shell')).toBeVisible()

    const reopened = await context.newPage()
    await reopened.goto(baseURL, { waitUntil: 'domcontentloaded' })
    await expect(reopened.locator('.app-shell')).toBeVisible()
    await expect(reopened.locator('#app')).not.toBeEmpty()
    await reopened.close()
  } finally {
    await context.setOffline(false)
  }

  expect(pageErrors).toEqual([])
})

test('complete backup exports, restores into blank storage, and survives reopen', async ({
  browser,
  request,
}, testInfo) => {
  await waitForExactRelease(request)
  const seeded = createSeededStorageState(testInfo.project.name)
  const sourceContext = await browser.newContext({
    baseURL,
    acceptDownloads: true,
    serviceWorkers: 'block',
    storageState: seeded.storageState,
  })
  const sourcePage = await sourceContext.newPage()
  const sourceErrors = []
  sourcePage.on('pageerror', (error) => sourceErrors.push(error.message))

  await unlockToHome(sourcePage)
  await navigateInsideUnlockedApp(sourcePage, '/settings')
  const downloadPromise = sourcePage.waitForEvent('download')
  await sourcePage.getByRole('button', { name: /Backup & Export|Exporting/ }).click()
  await sourcePage
    .getByRole('button', { name: 'I understand, continue download', exact: true })
    .click()
  const exportedText = await readDownloadText(await downloadPromise)
  const exported = JSON.parse(exportedText)

  expect(exported.moduleIdentity).toMatchObject(seeded.identity)
  expect(exported.settings.api.key).toBe(seeded.apiKey)
  expect(exported.backupMeta).toMatchObject({
    magic: 'schatphone-complete-backup',
    schemaVersion: expect.any(Number),
    packageId: expect.any(String),
  })
  expect(exported.backupMeta.manifest.sectionCount).toBeGreaterThan(20)
  expect(exported.backupMeta.manifest.sections).toHaveLength(
    exported.backupMeta.manifest.sectionCount,
  )
  expect(exported.backupMeta.manifest.payloadSha256).toMatch(/^[a-f0-9]{64}$/)
  expect(exported.backupMeta.manifest.manifestSha256).toMatch(/^[a-f0-9]{64}$/)
  expect(
    exported.backupMeta.manifest.sections.every((section) => /^[a-f0-9]{64}$/.test(section.sha256)),
  ).toBe(true)
  expect(sourceErrors).toEqual([])
  await sourceContext.close()

  const restoreContext = await browser.newContext({
    baseURL,
    acceptDownloads: true,
    serviceWorkers: 'block',
  })
  const restorePage = await restoreContext.newPage()
  const restoreErrors = []
  restorePage.on('pageerror', (error) => restoreErrors.push(error.message))

  await unlockToHome(restorePage)
  await restorePage.evaluate(() => {
    window.location.hash = '/settings'
  })
  await expect(restorePage.getByTestId('settings-backup-focus')).toBeVisible()
  await restorePage.locator('input[type="file"]').setInputFiles({
    name: 'hosted-complete-backup.json',
    mimeType: 'application/json',
    buffer: Buffer.from(exportedText, 'utf8'),
  })
  await restorePage
    .getByRole('button', { name: /Continue import|继续导入/, exact: true })
    .click()
  await expect(restorePage.getByText(/Import succeeded and data has been restored|导入成功/)).toBeVisible()

  await restorePage.reload({ waitUntil: 'domcontentloaded' })
  await unlockToHome(restorePage)
  const reopened = await readReopenedRecoveryEvidence(restorePage)

  expect(reopened.userName).toBe(`Hosted Owner ${testInfo.project.name}`)
  expect(reopened.apiKey).toBe(seeded.apiKey)
  expect(reopened.identity).toMatchObject(seeded.identity)
  expect(reopened.restoreJournal).toMatchObject({
    phase: 'completed',
    recoveryAction: 'backup_restore_committed_and_reopened',
  })
  expect(restoreErrors).toEqual([])
  await restoreContext.close()
})
