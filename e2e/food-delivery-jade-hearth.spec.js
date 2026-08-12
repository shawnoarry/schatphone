import { expect, test } from '@playwright/test'
import { projectUiAssetUrl } from '../src/lib/project-assets.js'
import { navigateInsideUnlockedApp, unlockToHome } from './helpers/navigation.js'

const expectNoHorizontalOverflow = async (page) => {
  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  )
  expect(hasHorizontalOverflow).toBe(false)
}

test('Jade Hearth keeps its Chinese table identity through feast, menu, checkout, and order review', async ({
  page,
}, testInfo) => {
  const pageErrors = []
  page.on('pageerror', (error) => {
    pageErrors.push(error.message)
  })

  await unlockToHome(page)
  await navigateInsideUnlockedApp(
    page,
    '/food-delivery?category=restaurants&restaurantId=food_seed_jade_hearth&entry=shop',
  )

  const storeShell = page.getByTestId('food-delivery-store-shell')
  await expect(storeShell).toHaveAttribute('data-store-template', 'jade_table_menu')
  await expect(page.getByTestId('food-delivery-view')).toHaveCSS(
    'background-color',
    'rgb(245, 239, 226)',
  )
  await expect(page.getByTestId('food-delivery-jade-hero')).toContainText(/玉炉雅席|Jade Hearth/)
  await expect(page.getByTestId('food-delivery-jade-hero')).toContainText(
    /一席入味，四时有章。|A table shaped by the season\./,
  )
  await expect(page.getByTestId('food-delivery-jade-nav')).toBeVisible()

  const heroImage = page.getByTestId('food-delivery-jade-hero').locator('img')
  await expect(heroImage).toHaveAttribute(
    'data-required-asset',
    'jade-hearth/cover/jade-hearth-cover-01.png',
  )
  await expect(heroImage).not.toHaveAttribute('data-asset-missing', 'true')
  await expect
    .poll(() =>
      heroImage.evaluate(
        (image) =>
          image.complete && image.naturalWidth > 0 && image.dataset.fallbackApplied !== 'true',
      ),
    )
    .toBe(true)

  const deliveredProductAssets = Array.from(
    { length: 12 },
    (_, index) => `jade-hearth/products/jade-hearth-item-${String(index + 1).padStart(2, '0')}.png`,
  )
  const deliveredProductAssetResults = []
  for (const assetPath of deliveredProductAssets) {
    const response = await page.request.get(
      projectUiAssetUrl(`apps/food-delivery/${assetPath}`),
    )
    deliveredProductAssetResults.push({
      assetPath,
      loaded: response.ok() && response.headers()['content-type']?.startsWith('image/'),
    })
  }
  expect(deliveredProductAssetResults).toEqual(
    deliveredProductAssets.map((assetPath) => ({ assetPath, loaded: true })),
  )
  await expect(
    page
      .getByTestId('food-delivery-menu-food_menu_jade_sea_bass')
      .locator('[data-required-asset="jade-hearth/products/jade-hearth-item-03.png"]'),
  ).toHaveCSS('object-fit', 'contain')

  const addressButton = page.getByTestId('food-delivery-jade-address')
  await expect(addressButton).toHaveAttribute('aria-expanded', 'false')
  await addressButton.click()
  await expect(addressButton).toHaveAttribute('aria-expanded', 'true')

  await testInfo.attach(`jade-hearth-home-${testInfo.project.name}`, {
    body: await page.screenshot(),
    contentType: 'image/png',
  })
  await testInfo.attach(`jade-hearth-home-table-${testInfo.project.name}`, {
    body: await page.getByTestId('food-delivery-store-menu-section-rail').screenshot(),
    contentType: 'image/png',
  })
  await expectNoHorizontalOverflow(page)

  await page.getByTestId('food-delivery-menu-open-food_menu_jade_sea_bass').click()
  const seaBassDetailImage = page
    .getByTestId('food-delivery-menu-detail-sheet')
    .locator('[data-required-asset="jade-hearth/products/jade-hearth-item-03.png"]')
  await expect(seaBassDetailImage).toBeVisible()
  await expect(seaBassDetailImage).not.toHaveAttribute('data-asset-missing', 'true')
  await testInfo.attach(`jade-hearth-sea-bass-detail-${testInfo.project.name}`, {
    body: await page.screenshot(),
    contentType: 'image/png',
  })
  await page.getByTestId('food-delivery-menu-detail-close').click()

  await page.getByTestId('food-delivery-jade-nav-feast').click()
  await expect(page).toHaveURL(/shopView=feast/)
  await expect(page.getByTestId('food-delivery-jade-feast-page')).toContainText(
    /按人数，把一餐配完整|A table for every kind of gathering/,
  )
  await testInfo.attach(`jade-hearth-feast-${testInfo.project.name}`, {
    body: await page.screenshot(),
    contentType: 'image/png',
  })

  await page.getByTestId('food-delivery-jade-nav-menu').click()
  await expect(page).toHaveURL(/shopView=menu/)
  await expect(page.getByTestId('food-delivery-jade-menu-page')).toBeVisible()
  await expect(page.getByTestId('food-delivery-store-menu-section-all')).toHaveCount(0)
  await expect(page.getByTestId('food-delivery-store-menu-section-rail')).toHaveAttribute(
    'tabindex',
    '0',
  )
  await expect(
    page.getByTestId('food-delivery-menu-food_menu_jade_tea_smoked_chicken'),
  ).toHaveAttribute('data-menu-card-style', 'paper-banquet-entry')
  await expect(
    page.getByTestId('food-delivery-add-food_menu_jade_tea_smoked_chicken'),
  ).toContainText(/添菜|Add dish/)
  await testInfo.attach(`jade-hearth-menu-${testInfo.project.name}`, {
    body: await page.screenshot(),
    contentType: 'image/png',
  })
  await expectNoHorizontalOverflow(page)

  await page.getByTestId('food-delivery-menu-open-food_menu_jade_tea_smoked_chicken').click()
  await expect(page.getByTestId('food-delivery-jade-detail-menu')).toHaveAttribute(
    'data-detail-layout',
    'banquet-menu',
  )
  await expect(page.getByTestId('food-delivery-menu-detail-sheet')).toContainText(
    /玉炉茶熏半鸡|Tea-Smoked Half Chicken/,
  )
  await expect(
    page
      .getByTestId('food-delivery-jade-detail-menu')
      .locator('[data-required-asset="jade-hearth/products/jade-hearth-item-01.png"]'),
  ).toHaveCSS('object-fit', 'contain')
  await testInfo.attach(`jade-hearth-detail-${testInfo.project.name}`, {
    body: await page.screenshot(),
    contentType: 'image/png',
  })
  await page.getByTestId('food-delivery-menu-detail-quantity-increase').click()
  await expect(page.getByTestId('food-delivery-menu-detail-quantity')).toContainText('2')
  await page.getByTestId('food-delivery-menu-detail-add').click()
  await page.getByTestId('food-delivery-menu-detail-close').click()

  await page.getByTestId('food-delivery-jade-header-bag').click()
  await expect(page).toHaveURL(/shopView=bag/)
  await expect(page.getByTestId('food-delivery-cart-panel')).toContainText(
    /玉炉茶熏半鸡|Tea-Smoked Half Chicken/,
  )
  await page.getByTestId('food-delivery-checkout').click()
  await expect(page.getByTestId('food-delivery-checkout-sheet')).toContainText(
    /玉炉雅席|Jade Hearth/,
  )
  await page.getByTestId('food-delivery-checkout-submit').click()

  await expect(page).toHaveURL(/shopView=order/)
  await expect(page).toHaveURL(/shopOrderId=/)
  await expect(page.getByTestId('food-delivery-jade-order-page')).toContainText(
    /玉炉茶熏半鸡|Tea-Smoked Half Chicken/,
  )
  await expect(page.getByTestId('food-delivery-jade-nav-orders')).toHaveAttribute(
    'aria-current',
    'page',
  )
  const orderId = new URL(page.url()).hash.match(/shopOrderId=([^&]+)/)?.[1] || ''
  expect(orderId).not.toBe('')
  await expect(page.getByTestId(`food-delivery-jade-check-update-${orderId}`)).toHaveCount(0)
  await expect(page.getByTestId('food-delivery-jade-order-page')).not.toContainText(
    /Dispatch brief|配送简报/,
  )
  await page.getByTestId(`food-delivery-jade-mark-delivered-${orderId}`).click()
  await expect(page.getByTestId(`food-delivery-jade-wallet-${orderId}`)).toBeVisible()
  await page.getByTestId(`food-delivery-jade-record-wallet-${orderId}`).click()
  await expect(page.getByTestId(`food-delivery-jade-record-wallet-${orderId}`)).toContainText(
    /已记录|Recorded/,
  )
  await testInfo.attach(`jade-hearth-order-${testInfo.project.name}`, {
    body: await page.screenshot(),
    contentType: 'image/png',
  })
  await expectNoHorizontalOverflow(page)

  expect(pageErrors).toEqual([])
})
