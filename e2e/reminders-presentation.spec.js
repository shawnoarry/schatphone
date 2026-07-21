import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { navigateInsideUnlockedApp, unlockToHome } from './helpers/navigation.js'

const themes = ['default', 'zen']
const longContactName = 'AlexandriaMontgomeryInternationalProfileWithoutBreaksAndSpaces'

const seedReminders = async (page, theme) => {
  await page.addInitScript(
    ({ currentTheme, contactName }) => {
      const now = Date.UTC(2026, 6, 21, 8, 0, 0)
      window.localStorage.setItem(
        'schatphone:store:system',
        JSON.stringify({
          version: 1,
          savedAt: now,
          data: {
            settings: {
              system: {
                language: 'en-US',
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
        'schatphone:store:reminders',
        JSON.stringify({
          version: 1,
          savedAt: now,
          data: {
            phoneMissedCallCues: [
              {
                id: 'phone_missed_call_cue_long_name',
                callId: 'call_long_name',
                contactName,
                summary: 'Return the missed call and agree on the next step.',
                suggestedAt: now + 30 * 60 * 1000,
                status: 'suggested',
                route: '/phone',
                createdAt: now,
                updatedAt: now,
              },
            ],
            shoppingDeliveryCues: [
              {
                id: 'shopping_delivery_cue_confirmed',
                orderId: 'order_confirmed',
                title: 'Studio reference materials',
                itemCount: 2,
                summary: 'Delivery follow-up is already confirmed for Calendar.',
                suggestedAt: now + 24 * 60 * 60 * 1000,
                status: 'confirmed',
                route: '/shopping',
                createdAt: now,
                updatedAt: now,
              },
            ],
            stockMarketCues: [],
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

const expectVisibleFocus = async (locator) => {
  await expect(locator).toBeFocused()
  const focusStyle = await locator.evaluate((element) => {
    const style = window.getComputedStyle(element)
    return {
      outlineStyle: style.outlineStyle,
      outlineWidth: Number.parseFloat(style.outlineWidth),
    }
  })

  expect(focusStyle.outlineStyle).not.toBe('none')
  expect(focusStyle.outlineWidth).toBeGreaterThanOrEqual(2)
}

for (const theme of themes) {
  test(`${theme} Reminders presents filters, long content, and empty states clearly`, async ({
    page,
  }, testInfo) => {
    const pageErrors = []
    page.on('pageerror', (error) => pageErrors.push(error.message))

    await page.emulateMedia({ reducedMotion: 'reduce' })
    await seedReminders(page, theme)
    await unlockToHome(page)
    await navigateInsideUnlockedApp(page, '/reminders')

    await expect(page.locator('.app-shell')).toHaveAttribute('data-theme', theme)
    await expect(page.getByRole('heading', { name: 'Reminders', level: 1 })).toBeVisible()
    await expect(page.locator('body')).not.toContainText(/phase one|old Calendar store/i)
    await expectNoHorizontalOverflow(page)

    const phoneCard = page.getByTestId('reminder-card-phone:phone_missed_call_cue_long_name')
    const shoppingCard = page.getByTestId('reminder-card-shopping:shopping_delivery_cue_confirmed')
    await expect(phoneCard).toBeVisible()
    await expect(shoppingCard).toContainText('Confirmed')
    await expect(shoppingCard).toContainText('In Calendar')

    const longTitle = phoneCard.locator('.reminder-card__title')
    await expect(longTitle).toContainText(longContactName)
    const longTitleLayout = await longTitle.evaluate((element) => {
      const style = window.getComputedStyle(element)
      const range = document.createRange()
      range.selectNodeContents(element)
      return {
        clientWidth: element.clientWidth,
        scrollWidth: element.scrollWidth,
        height: element.getBoundingClientRect().height,
        lineHeight: Number.parseFloat(style.lineHeight),
        lineCount: [...range.getClientRects()].filter(
          (bounds) => bounds.width > 0 && bounds.height > 0,
        ).length,
      }
    })
    expect(longTitleLayout.scrollWidth).toBeLessThanOrEqual(longTitleLayout.clientWidth + 1)
    if (testInfo.project.name === 'mobile-chrome') {
      expect(
        longTitleLayout.lineCount,
        'long reminder title should wrap on mobile',
      ).toBeGreaterThan(1)
      expect(longTitleLayout.height).toBeGreaterThan(longTitleLayout.lineHeight)
    }
    await testInfo.attach(`reminders-long-card-${theme}.png`, {
      body: await phoneCard.screenshot({ animations: 'disabled' }),
      contentType: 'image/png',
    })

    const phoneFilter = page.getByTestId('reminders-source-filter-phone')
    let phoneFilterFocused = false
    for (let index = 0; index < 8 && !phoneFilterFocused; index += 1) {
      await page.keyboard.press('Tab')
      phoneFilterFocused = await phoneFilter.evaluate(
        (element) => document.activeElement === element,
      )
    }
    expect(phoneFilterFocused, 'phone filter should be keyboard reachable').toBe(true)
    await expectVisibleFocus(phoneFilter)
    const filterHeight = await phoneFilter.evaluate(
      (element) => element.getBoundingClientRect().height,
    )
    expect(filterHeight, 'filter should retain a touch-sized target').toBeGreaterThanOrEqual(44)

    for (const button of await page.locator('.reminders-page button').all()) {
      await expect(button).toHaveAttribute('type', 'button')
    }

    await expectNoCriticalAxeViolations(page)
    await testInfo.attach(`reminders-populated-${theme}.png`, {
      body: await page.screenshot({ animations: 'disabled' }),
      contentType: 'image/png',
    })

    await phoneFilter.click()
    await expect(phoneFilter).toHaveAttribute('aria-pressed', 'true')
    const confirmedFilter = page.getByTestId('reminders-status-filter-confirmed')
    await confirmedFilter.click()
    await expect(confirmedFilter).toHaveAttribute('aria-pressed', 'true')

    const filteredEmpty = page.getByTestId('reminders-empty-state')
    await expect(filteredEmpty).toHaveAttribute('data-empty-kind', 'filtered')
    await expect(filteredEmpty).toContainText('No reminders match these filters')
    await expect(page.getByTestId('reminders-filtered-count')).toContainText('0 / 2 items')
    await expectNoHorizontalOverflow(page)
    await expectNoCriticalAxeViolations(page)
    await testInfo.attach(`reminders-filtered-empty-${theme}.png`, {
      body: await page.screenshot({ animations: 'disabled' }),
      contentType: 'image/png',
    })

    await page.getByTestId('reminders-empty-reset').click()
    await expect(page.getByTestId('reminders-source-filter-all')).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    await expect(page.getByTestId('reminders-status-filter-all')).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    await expect(phoneCard).toBeVisible()
    await expect(shoppingCard).toBeVisible()

    await phoneCard.getByRole('button', { name: 'Dismiss' }).click()
    await shoppingCard.getByRole('button', { name: 'Dismiss' }).click()

    const collectionEmpty = page.getByTestId('reminders-empty-state')
    await expect(collectionEmpty).toHaveAttribute('data-empty-kind', 'collection')
    await expect(collectionEmpty).toContainText('No reminders yet')
    await expect(collectionEmpty).not.toContainText('No reminders match these filters')
    await expectNoHorizontalOverflow(page)
    await testInfo.attach(`reminders-collection-empty-${theme}.png`, {
      body: await page.screenshot({ animations: 'disabled' }),
      contentType: 'image/png',
    })

    expect(pageErrors).toEqual([])
  })
}
