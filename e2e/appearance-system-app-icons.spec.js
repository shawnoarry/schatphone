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

  expect(overflow.document).toBeLessThanOrEqual(1)
  expect(overflow.body).toBeLessThanOrEqual(1)
}

const readShoppingBrandSources = async (page) => {
  await navigateInsideUnlockedApp(page, '/home?homePage=1')
  await page.getByTestId('home-folder-app_shopping').click()
  await expect(page.getByTestId('home-folder-overlay')).toBeVisible()
  const sources = await page
    .locator('[data-testid^="home-folder-entry-image-shop_app_shopping_"]')
    .evaluateAll((images) => images.map((image) => image.getAttribute('src')))
  await page.locator('.home-folder-panel-head button').click()
  return sources
}

test('Appearance switches system app icons while preserving commercial brand logos', async ({
  page,
}) => {
  const pageErrors = []
  page.on('pageerror', (error) => pageErrors.push(error.message))

  await page.emulateMedia({ reducedMotion: 'reduce' })
  await unlockToHome(page)

  await expect(page.getByTestId('home-dock-icon-app_chat').locator('i')).toHaveClass(/fa-comment/)
  const brandSourcesBefore = await readShoppingBrandSources(page)
  expect(brandSourcesBefore).toHaveLength(6)

  await navigateInsideUnlockedApp(page, '/appearance')
  await page.getByTestId('appearance-system-icons-entry').click()
  await expect(page.getByTestId('appearance-system-icons-page')).toBeVisible()
  await page.getByTestId('appearance-system-app-icon-theme-soft-rounded').click()
  await expect(
    page.getByTestId('appearance-system-app-icon-theme-soft-rounded'),
  ).toHaveAttribute('aria-pressed', 'true')
  await expectNoHorizontalOverflow(page)

  await navigateInsideUnlockedApp(page, '/home')
  await expect(page.getByTestId('home-dock-icon-app_chat').locator('i')).toHaveClass(/fa-message/)
  await expect(page.getByTestId('home-dock-icon-app_contacts').locator('i')).toHaveClass(
    /fa-user-group/,
  )
  await expect(page.getByTestId('home-dock-icon-app_settings').locator('i')).toHaveClass(
    /fa-sliders/,
  )
  await expect(page.getByTestId('home-dock-icon-app_widgets').locator('i')).toHaveClass(/fa-grip/)
  await expect
    .poll(() =>
      page
        .locator('[data-testid^="home-dock-icon-app_"] i')
        .evaluateAll((icons) =>
          icons.every((icon) => {
            const content = getComputedStyle(icon, '::before').content
            return content && content !== 'none' && content !== 'normal' && content !== '""'
          }),
        ),
    )
    .toBe(true)

  const brandSourcesAfter = await readShoppingBrandSources(page)
  expect(brandSourcesAfter).toEqual(brandSourcesBefore)

  await page.reload()
  await unlockToHome(page)
  await expect(page.getByTestId('home-dock-icon-app_chat').locator('i')).toHaveClass(/fa-message/)
  expect(pageErrors).toEqual([])
})
