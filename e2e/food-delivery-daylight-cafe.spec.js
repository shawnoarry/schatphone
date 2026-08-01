import { expect, test } from '@playwright/test'
import { navigateInsideUnlockedApp, unlockToHome } from './helpers/navigation.js'

const expectNoHorizontalOverflow = async (page) => {
  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  )
  expect(hasHorizontalOverflow).toBe(false)
}

test('Daylight Cafe loads its complete bright-morning asset pack without destructive detail crops', async ({
  page,
}, testInfo) => {
  const pageErrors = []
  const consoleErrors = []
  page.on('pageerror', (error) => pageErrors.push(error.message))
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text())
  })

  await unlockToHome(page)
  await navigateInsideUnlockedApp(
    page,
    '/food-delivery?category=cafe&restaurantId=food_seed_daylight_cafe&entry=shop',
  )

  const storeShell = page.getByTestId('food-delivery-store-shell')
  await expect(storeShell).toHaveAttribute('data-store-template', 'cafe_counter')
  await expect(page.getByTestId('food-delivery-store-menu-section-all')).toHaveCount(0)

  const identityImage = storeShell.locator('img[alt="Daylight Cafe coffee"]')
  await expect(identityImage).toHaveAttribute(
    'src',
    /daylight-cafe\/cover\/daylight-cafe-cover-01\.png$/,
  )
  await expect(identityImage).toHaveCSS('object-position', '68% 50%')
  await expect
    .poll(() =>
      identityImage.evaluate((image) => ({
        complete: image.complete,
        width: image.naturalWidth,
        height: image.naturalHeight,
      })),
    )
    .toEqual({ complete: true, width: 1200, height: 750 })

  const productImages = page.locator('[data-testid^="food-delivery-menu-open-"] img')
  await expect(productImages).toHaveCount(3)
  const productResults = await productImages.evaluateAll((images) =>
    images.map((image) => ({
      complete: image.complete,
      width: image.naturalWidth,
      height: image.naturalHeight,
      src: image.getAttribute('src'),
    })),
  )
  expect(productResults.every((image) => image.complete)).toBe(true)
  expect(productResults.every((image) => image.width === 768 && image.height === 768)).toBe(true)
  expect(
    productResults.every((image) =>
      image.src?.includes('/images/ui-assets/apps/food-delivery/daylight-cafe/products/'),
    ),
  ).toBe(true)
  expect(new Set(productResults.map((image) => image.src)).size).toBe(3)

  await testInfo.attach(`daylight-cafe-menu-${testInfo.project.name}`, {
    body: await page.screenshot(),
    contentType: 'image/png',
  })
  await expectNoHorizontalOverflow(page)

  await page.getByTestId('food-delivery-store-menu-section-cold_drinks').click()
  await page
    .getByTestId('food-delivery-menu-open-food_menu_daylight_vanilla_cold_brew')
    .click()
  const detailImage = page.getByTestId('food-delivery-menu-detail-sheet').locator('img')
  await expect(detailImage).toHaveAttribute(
    'src',
    /daylight-cafe\/products\/daylight-cafe-item-09\.png$/,
  )
  await expect(detailImage).toHaveCSS('object-fit', 'contain')
  await expect
    .poll(() =>
      detailImage.evaluate((image) => ({
        complete: image.complete,
        width: image.naturalWidth,
        height: image.naturalHeight,
      })),
    )
    .toEqual({ complete: true, width: 768, height: 768 })

  await testInfo.attach(`daylight-cafe-detail-${testInfo.project.name}`, {
    body: await page.screenshot(),
    contentType: 'image/png',
  })
  await expectNoHorizontalOverflow(page)

  expect(pageErrors).toEqual([])
  expect(consoleErrors).toEqual([])
})
