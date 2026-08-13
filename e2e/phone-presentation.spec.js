import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { navigateInsideUnlockedApp, unlockToHome } from './helpers/navigation.js'

const themes = ['default', 'zen']
const longContactName = 'AlexandriaMontgomeryInternationalCallbackWithoutBreaks'

const seedPhone = async (page, theme) => {
  await page.addInitScript(
    ({ currentTheme, contactName }) => {
      const now = Date.now()
      window.localStorage.setItem(
        'schatphone:store:system',
        JSON.stringify({
          version: 1,
          savedAt: now,
          data: {
            settings: {
              system: {
                language: 'en-US',
                notifications: false,
              },
              appearance: {
                currentTheme,
                wallpaperMode: 'theme',
              },
            },
          },
        }),
      )
      window.localStorage.setItem(
        'schatphone:store:phone',
        JSON.stringify({
          version: 1,
          savedAt: now,
          data: {
            calls: [
              {
                id: 'phone_visual_outgoing',
                contactName,
                direction: 'outgoing',
                status: 'completed',
                durationSec: 252,
                summary: 'Review the callback notes before the next conversation.',
                sourceModule: 'phone_manual',
                startedAt: now - 18 * 60 * 1000,
                createdAt: now - 18 * 60 * 1000,
                updatedAt: now - 18 * 60 * 1000,
              },
              {
                id: 'phone_visual_missed',
                contactName: 'Mina',
                direction: 'missed',
                status: 'missed',
                durationSec: 0,
                summary: 'Call back after the planning session.',
                sourceModule: 'phone_manual',
                startedAt: now - 52 * 60 * 1000,
                createdAt: now - 52 * 60 * 1000,
                updatedAt: now - 52 * 60 * 1000,
              },
            ],
          },
        }),
      )
    },
    { currentTheme: theme, contactName: longContactName },
  )
}

const expectNoHorizontalOverflow = async (page) => {
  const overflow = await page.evaluate(() => ({
    document: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    body: document.body.scrollWidth - document.body.clientWidth,
  }))

  expect(overflow.document, 'document should not overflow horizontally').toBeLessThanOrEqual(1)
  expect(overflow.body, 'body should not overflow horizontally').toBeLessThanOrEqual(1)
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

for (const theme of themes) {
  test(`${theme} Phone supports recents, keypad calling, and call recording`, async ({
    page,
  }, testInfo) => {
    const pageErrors = []
    const consoleErrors = []
    page.on('pageerror', (error) => pageErrors.push(error.message))
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text())
    })

    await page.emulateMedia({ reducedMotion: 'reduce' })
    await seedPhone(page, theme)
    await unlockToHome(page)
    await navigateInsideUnlockedApp(page, '/phone')

    await expect(page.locator('.app-shell')).toHaveAttribute('data-theme', theme)
    await expect(page.getByRole('heading', { name: 'Phone', level: 1 })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Recents', level: 2 })).toBeVisible()
    await expect(page.getByTestId('phone-composer-sheet')).toHaveCount(0)
    await expect(page.getByTestId('phone-call-phone_visual_outgoing')).toBeVisible()
    await expect(page.getByTestId('phone-call-phone_visual_outgoing')).toContainText(longContactName)
    await expect(page.getByTestId('phone-call-phone_visual_missed')).toContainText('Missed call')
    await expect(page.getByTestId('phone-tab-recents')).toHaveAttribute('aria-current', 'page')
    await expectNoHorizontalOverflow(page)
    await expectNoCriticalAxeViolations(page)

    const firstCallBounds = await page.getByTestId('phone-call-phone_visual_outgoing').boundingBox()
    const viewport = page.viewportSize()
    expect(firstCallBounds).not.toBeNull()
    expect(viewport).not.toBeNull()
    expect(firstCallBounds.y, 'the first call should begin in the first viewport').toBeLessThan(
      viewport.height,
    )

    await testInfo.attach(`phone-recents-${theme}.png`, {
      body: await page.screenshot({ animations: 'disabled' }),
      contentType: 'image/png',
    })

    await page.getByTestId('phone-filter-missed').click()
    await expect(page.getByTestId('phone-call-phone_visual_missed')).toBeVisible()
    await expect(page.getByTestId('phone-call-phone_visual_outgoing')).toHaveCount(0)

    await page.getByTestId('phone-tab-keypad').click()
    await expect(page.getByTestId('phone-keypad-view')).toBeVisible()
    await page.getByTestId('phone-dial-input').fill('1001')
    await expect(page.getByTestId('phone-keypad-view')).toContainText('Eva')
    await expectNoHorizontalOverflow(page)

    await testInfo.attach(`phone-keypad-${theme}.png`, {
      body: await page.screenshot({ animations: 'disabled' }),
      contentType: 'image/png',
    })

    await page.getByTestId('phone-place-call').click()
    const activeCall = page.getByTestId('phone-active-call')
    await expect(activeCall).toBeVisible()
    await expect(activeCall).toContainText('Eva')
    await expect(activeCall).toContainText(/00:0/)
    await page.getByTestId('phone-toggle-mute').click()
    await expect(page.getByTestId('phone-toggle-mute')).toHaveAttribute('aria-pressed', 'true')
    await page.getByTestId('phone-toggle-speaker').click()
    await expect(page.getByTestId('phone-toggle-speaker')).toHaveAttribute('aria-pressed', 'true')
    await page.getByTestId('phone-open-live-keypad').click()
    await expect(page.getByTestId('phone-live-keypad')).toBeVisible()
    await expectNoHorizontalOverflow(page)
    await expectNoCriticalAxeViolations(page)

    await testInfo.attach(`phone-active-call-${theme}.png`, {
      body: await page.screenshot({ animations: 'disabled' }),
      contentType: 'image/png',
    })

    await page.getByTestId('phone-end-call').click()
    await expect(activeCall).toHaveCount(0)
    await expect(page.getByTestId('phone-recents-view')).toBeVisible()
    await expect(page.getByTestId('phone-feedback')).toContainText('Call ended')
    await expect(page.getByRole('button', { name: /^Eva, Outgoing,/ })).toBeVisible()

    await page.getByTestId('phone-open-composer').click()
    const composer = page.getByTestId('phone-composer-sheet')
    await expect(composer).toBeVisible()
    await expect(composer).toHaveAttribute('role', 'dialog')
    await page.getByTestId('phone-relationship-contact').selectOption('1')
    await page.getByTestId('phone-direction-incoming').click()
    await page.getByTestId('phone-duration').fill('4')
    await page.getByTestId('phone-summary').fill('Confirm the next planning window.')
    await expectNoHorizontalOverflow(page)

    const composerBounds = await composer.boundingBox()
    expect(composerBounds).not.toBeNull()
    expect(composerBounds.x).toBeGreaterThanOrEqual(0)
    expect(composerBounds.x + composerBounds.width).toBeLessThanOrEqual(viewport.width + 1)
    expect(composerBounds.y + composerBounds.height).toBeLessThanOrEqual(viewport.height + 1)

    await testInfo.attach(`phone-composer-${theme}.png`, {
      body: await page.screenshot({ animations: 'disabled' }),
      contentType: 'image/png',
    })

    await page.getByTestId('phone-save-call').click()
    await expect(composer).toHaveCount(0)
    await expect(page.getByTestId('phone-feedback')).toContainText('Call saved')
    await expect(page.getByTestId('phone-filter-all')).toHaveAttribute('aria-pressed', 'true')

    const evaCall = page.getByRole('button', { name: /^Eva, Incoming,/ })
    await expect(evaCall).toBeVisible()
    await evaCall.click()
    const detail = page.getByTestId('phone-detail-sheet')
    await expect(detail).toBeVisible()
    await expect(detail).toContainText('Confirm the next planning window.')
    await expectNoHorizontalOverflow(page)

    await page.getByRole('button', { name: 'Delete call' }).click()
    const confirmation = page.locator('.app-dialog-panel')
    await expect(confirmation).toContainText('Delete this call?')
    await confirmation.getByRole('button', { name: 'Delete' }).click()
    await expect(detail).toHaveCount(0)
    await expect(evaCall).toHaveCount(0)

    expect(pageErrors).toEqual([])
    expect(consoleErrors).toEqual([])
  })
}
