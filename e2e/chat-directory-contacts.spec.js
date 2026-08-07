import { expect, test } from '@playwright/test'
import { navigateInsideUnlockedApp, unlockToHome } from './helpers/navigation.js'

test.use({
  trace: 'off',
  screenshot: 'only-on-failure',
  video: 'off',
})

const expectNoHorizontalOverflow = async (page) => {
  const overflow = await page.evaluate(() => ({
    document: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    body: document.body.scrollWidth - document.body.clientWidth,
  }))

  expect(overflow.document, 'document should not overflow horizontally').toBeLessThanOrEqual(1)
  expect(overflow.body, 'body should not overflow horizontally').toBeLessThanOrEqual(1)
}

test('Contacts keeps secondary contact actions behind the overflow menu', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await unlockToHome(page)
  await navigateInsideUnlockedApp(page, '/chat-contacts?section=roles')

  await expect(page.getByTestId('chat-app-tab-objects')).toContainText(/联系人|Contacts/)
  await expect(page.getByTestId('chat-directory-section-roles')).toContainText(/联系人|Contacts/)

  const moreAction = page.locator('[data-testid^="chat-directory-role-more-"]').first()
  await expect(moreAction).toBeVisible()

  const moreActionTestId = await moreAction.getAttribute('data-testid')
  const contactId = moreActionTestId?.replace('chat-directory-role-more-', '')
  expect(contactId).toBeTruthy()

  const preferencesAction = page.getByTestId(`chat-directory-role-meta-${contactId}`)
  const unbindAction = page.getByTestId(`chat-directory-unbind-${contactId}`)
  await expect(preferencesAction).toHaveCount(0)
  await expect(unbindAction).toHaveCount(0)
  await expectNoHorizontalOverflow(page)

  await moreAction.click()
  await expect(page.getByTestId(`chat-directory-role-menu-${contactId}`)).toBeVisible()
  await expect(preferencesAction).toBeVisible()
  await expect(unbindAction).toBeVisible()
  await expectNoHorizontalOverflow(page)
})
