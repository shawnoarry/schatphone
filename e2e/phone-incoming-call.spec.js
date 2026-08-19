import { expect, test } from '@playwright/test'
import { navigateInsideUnlockedApp, unlockToHome } from './helpers/navigation.js'

test('incoming call rings globally, is accepted into the active call UI, and saves an incoming record', async ({ page }) => {
  await unlockToHome(page)
  await navigateInsideUnlockedApp(page, '/phone')

  await page.getByTestId('phone-tab-contacts').click()
  const contactsView = page.getByTestId('phone-contacts-view')
  await expect(contactsView).toBeVisible()

  const contactRow = contactsView.locator('article.phone-contact-row').first()
  await expect(contactRow).toBeVisible()
  const incomingButton = contactRow.locator('[data-testid^="phone-incoming-contact-"]')
  await expect(incomingButton).toBeVisible()
  const callerName = (await contactRow.locator('strong').textContent())?.trim() || ''
  expect(callerName).not.toBe('')

  await incomingButton.click()

  const overlay = page.getByTestId('incoming-call-overlay')
  await expect(overlay).toBeVisible()
  await expect(page.getByTestId('incoming-call-name')).toHaveText(callerName)

  await page.getByTestId('incoming-call-accept').click()

  const activeCall = page.getByTestId('phone-active-call')
  await expect(activeCall).toBeVisible()
  await expect(activeCall.locator('h2')).toHaveText(callerName)

  await page.getByTestId('phone-end-call').click()

  await expect(page.getByTestId('phone-recents-view')).toBeVisible()
  const latestRow = page.locator('[data-testid^="phone-call-"]').first()
  await expect(latestRow).toContainText(callerName)
})

test('declining an incoming call dismisses the overlay and records a declined call', async ({ page }) => {
  await unlockToHome(page)
  await navigateInsideUnlockedApp(page, '/phone')

  await page.getByTestId('phone-tab-contacts').click()
  const contactRow = page.locator('article.phone-contact-row').first()
  const incomingButton = contactRow.locator('[data-testid^="phone-incoming-contact-"]')
  const callerName = (await contactRow.locator('strong').textContent())?.trim() || ''
  await incomingButton.click()

  const overlay = page.getByTestId('incoming-call-overlay')
  await expect(overlay).toBeVisible()

  await page.getByTestId('incoming-call-decline').click()

  await expect(overlay).toHaveCount(0)
  await expect(page.getByTestId('phone-active-call')).toHaveCount(0)

  await page.getByTestId('phone-tab-recents').click()
  const callList = page.getByTestId('phone-call-list')
  await expect(callList).toBeVisible()
  const latestCall = callList.locator('.phone-call-row').first()
  await expect(latestCall).toContainText(callerName)
})
