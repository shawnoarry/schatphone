import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { navigateInsideUnlockedApp, unlockToHome, waitForAppRouteReady } from './helpers/navigation.js'

const evidenceDir = fileURLToPath(new URL('../output/e2e/mail-app-shell/', import.meta.url))

const seedQuietEnglishSystem = async (page) => {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      'schatphone:store:system',
      JSON.stringify({
        version: 1,
        savedAt: Date.now(),
        data: {
          settings: {
            system: { language: 'en-US', notifications: false, realPushEnabled: false },
            appearance: { currentTheme: 'default', wallpaperMode: 'theme' },
          },
        },
      }),
    )
  })
}

const seedMailArrivalProvider = async (page) => {
  await page.addInitScript(() => {
    const raw = window.localStorage.getItem('schatphone:store:system')
    const parsed = raw ? JSON.parse(raw) : { version: 1, savedAt: Date.now(), data: { settings: {} } }
    parsed.data.settings.api = {
      url: 'https://mail-arrival.provider.test/v1/chat/completions',
      key: 'e2e-mail-key',
      model: 'e2e-mail-model',
      transportMode: 'direct',
    }
    window.localStorage.setItem('schatphone:store:system', JSON.stringify(parsed))
  })

  await page.route('https://mail-arrival.provider.test/**', async (route) => {
    const request = route.request()
    if (request.method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'access-control-allow-origin': '*' },
        body: JSON.stringify({ data: [{ id: 'e2e-mail-model' }] }),
      })
      return
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: { 'access-control-allow-origin': '*' },
      body: JSON.stringify({
        choices: [
          {
            message: {
              content: JSON.stringify({
                senderName: '다온뱅크',
                senderAddress: 'statement@daonbank.kr',
                subject: 'Your August statement is ready',
                body: [
                  'The August statement is now available.',
                  'Open the app to review the details.',
                ],
                label: 'statement',
              }),
            },
          },
        ],
      }),
    })
  })
}

const openFolder = async (page, testInfo, folderId) => {
  if (testInfo.project.name === 'mobile-chrome') {
    await page.getByTestId('mail-rail-toggle').click()
    const drawer = page.getByTestId('mail-rail-drawer')
    await expect(drawer).toBeVisible()
    await drawer.getByTestId(`mail-folder-${folderId}`).click()
    await expect(drawer).toHaveCount(0)
    return
  }
  await page.getByTestId(`mail-folder-${folderId}`).click()
}

const expectNoMailOverflow = async (page) => {
  const overflow = await page.evaluate(() => {
    const target = document.querySelector('[data-testid="daon-mail-app"]')
    return {
      document: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      body: document.body.scrollWidth - document.body.clientWidth,
      target: target instanceof HTMLElement ? target.scrollWidth - target.clientWidth : 0,
    }
  })
  expect(overflow.document, 'document should not overflow horizontally').toBeLessThanOrEqual(1)
  expect(overflow.body, 'body should not overflow horizontally').toBeLessThanOrEqual(1)
  expect(overflow.target, 'Mail shell should not overflow horizontally').toBeLessThanOrEqual(1)
}

const openMailFromHome = async (page) => {
  await unlockToHome(page)
  await navigateInsideUnlockedApp(page, '/home?homePage=1')
  const mailTile = page.locator('[data-home-tile-id="app_daon_mail"]')
  await expect(mailTile).toBeVisible()
  await mailTile.click()
  await waitForAppRouteReady(page, '/mail')
}

test('Mail opens from Home page 2 as a complete portal inbox', async ({ page }, testInfo) => {
  const pageErrors = []
  page.on('pageerror', (error) => pageErrors.push(error.message))
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await seedQuietEnglishSystem(page)
  await openMailFromHome(page)

  if (testInfo.project.name !== 'mobile-chrome') {
    await expect(page.getByTestId('mail-folder-rail')).toBeVisible()
  }
  await expect(page.getByTestId('mail-thread-row-mail_fixture_hanul_schedule')).toBeVisible()
  await expect(page.getByTestId('mail-thread-row-mail_fixture_hanul_schedule')).toContainText(
    'Hanul Entertainment',
  )
  await expect(page.getByTestId('mail-folder-inbox').first()).toContainText('4')

  await openFolder(page, testInfo, 'spam')
  await expect(page.getByTestId('mail-thread-row-mail_fixture_lucky_spam')).toBeVisible()
  await openFolder(page, testInfo, 'inbox')
  await expect(page.getByTestId('mail-thread-row-mail_fixture_hanul_schedule')).toBeVisible()

  await expectNoMailOverflow(page)
  const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
  expect(result.violations.filter((violation) => violation.impact === 'critical')).toEqual([])
  expect(pageErrors).toEqual([])

  await mkdir(evidenceDir, { recursive: true })
  await page.screenshot({ path: join(evidenceDir, `inbox-${testInfo.project.name}.png`) })
})

test('thread detail, calendar deep link, and archive form an ordinary loop', async ({ page }, testInfo) => {
  const pageErrors = []
  page.on('pageerror', (error) => pageErrors.push(error.message))
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await seedQuietEnglishSystem(page)
  await openMailFromHome(page)

  await page.getByTestId('mail-thread-row-mail_fixture_snuh_checkup').click()
  await expect(page.getByTestId('mail-thread-detail')).toContainText('health checkup')
  await expect(page.getByTestId('mail-thread-detail')).toContainText('reserve@snuh-health.kr')
  await page.getByTestId('mail-invite-open-mail_fixture_snuh_checkup_1').click()
  await waitForAppRouteReady(page, '/calendar')
  await expect(page).toHaveURL(/source=mail/)

  await navigateInsideUnlockedApp(page, '/mail')
  await page.getByTestId('mail-thread-row-mail_fixture_kurly_shipped').click()
  await expect(page.getByTestId('mail-thread-detail')).toContainText('order 2608-195-442')
  await page.getByTestId('mail-detail-archive').click()
  await expect(page.getByTestId('mail-thread-detail')).toHaveCount(0)
  await expect(page.getByTestId('mail-thread-row-mail_fixture_kurly_shipped')).toHaveCount(0)

  await openFolder(page, testInfo, 'archive')
  await expect(page.getByTestId('mail-thread-row-mail_fixture_kurly_shipped')).toBeVisible()
  await expectNoMailOverflow(page)
  expect(pageErrors).toEqual([])
})

test('draft and local send survive a full reload', async ({ page }, testInfo) => {
  const pageErrors = []
  page.on('pageerror', (error) => pageErrors.push(error.message))
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await seedQuietEnglishSystem(page)
  await openMailFromHome(page)

  await page.getByTestId('mail-compose-open').click()
  await page.getByTestId('mail-compose-to').fill('schedule@hanul-enter.kr')
  await page.getByTestId('mail-compose-subject').fill('Tuesday meeting materials reviewed')
  await page.getByTestId('mail-compose-body').fill('Materials reviewed. See you at the meeting.')
  await page.getByTestId('mail-compose-save').click()
  await expect(page.getByTestId('mail-compose-note')).toContainText('Drafts')
  await page.getByTestId('mail-compose-cancel').click()

  await page.reload()
  await unlockToHome(page)
  await navigateInsideUnlockedApp(page, '/mail')
  await openFolder(page, testInfo, 'drafts')
  const draftRow = page.locator('[data-testid^="mail-thread-row-mail_draft_"]')
  await expect(draftRow).toHaveCount(1)
  await expect(draftRow).toContainText('schedule@hanul-enter.kr')
  await draftRow.click()
  await expect(page.getByTestId('mail-compose-subject')).toHaveValue('Tuesday meeting materials reviewed')
  await page.getByTestId('mail-compose-send').click()
  await expect(page.getByTestId('mail-thread-detail')).toContainText('schedule@hanul-enter.kr')
  await expect(page.getByTestId('mail-thread-detail')).toContainText('Tuesday meeting materials reviewed')

  await page.reload()
  await unlockToHome(page)
  await navigateInsideUnlockedApp(page, '/mail')
  await openFolder(page, testInfo, 'sent')
  await expect(
    page.locator('[data-testid^="mail-thread-row-mail_sent_"]').first(),
  ).toContainText('Tuesday meeting materials reviewed')
  await expectNoMailOverflow(page)
  expect(pageErrors).toEqual([])

  await mkdir(evidenceDir, { recursive: true })
  await page.screenshot({ path: join(evidenceDir, `sent-${testInfo.project.name}.png`) })
})

test('receive generates one AI letter through the configured provider', async ({ page }) => {
  const pageErrors = []
  page.on('pageerror', (error) => pageErrors.push(error.message))
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await seedQuietEnglishSystem(page)
  await seedMailArrivalProvider(page)
  await openMailFromHome(page)

  await page.getByTestId('mail-receive').click()
  await expect(page.getByTestId('mail-arrival-status')).toContainText('1 new letter')

  const receivedRow = page.locator('[data-testid^="mail-thread-row-mail_received_"]')
  await expect(receivedRow).toHaveCount(1)
  await expect(receivedRow).toContainText('다온뱅크')
  await expect(receivedRow).toContainText('Your August statement is ready')
  await expect(receivedRow).toHaveClass(/is-unread/)

  await receivedRow.click()
  const detail = page.getByTestId('mail-thread-detail')
  await expect(detail).toContainText('statement@daonbank.kr')
  await expect(detail).toContainText('e2e-mail-model')

  await page.reload()
  await unlockToHome(page)
  await navigateInsideUnlockedApp(page, '/mail')
  await expect(page.locator('[data-testid^="mail-thread-row-mail_received_"]')).toHaveCount(1)
  await expectNoMailOverflow(page)
  expect(pageErrors).toEqual([])
})
