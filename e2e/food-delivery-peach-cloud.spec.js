import { expect, test } from '@playwright/test'
import { navigateInsideUnlockedApp, unlockToHome } from './helpers/navigation.js'

const expectNoHorizontalOverflow = async (page) => {
  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  )
  expect(hasHorizontalOverflow).toBe(false)
}

test('Peach Cloud keeps its own visual identity through browse, cart, checkout, and order review', async ({
  page,
}, testInfo) => {
  const pageErrors = []
  page.on('pageerror', (error) => {
    pageErrors.push(error.message)
  })

  await unlockToHome(page)
  await navigateInsideUnlockedApp(
    page,
    '/food-delivery?category=dessert&restaurantId=food_seed_peach_cloud&entry=shop',
  )

  const storeShell = page.getByTestId('food-delivery-store-shell')
  await expect(storeShell).toHaveAttribute('data-store-template', 'dessert_window')
  await expect(page.getByTestId('food-delivery-view')).toHaveCSS(
    'background-color',
    'rgb(242, 251, 224)',
  )
  await expect(page.getByTestId('food-delivery-peach-cloud-nav')).toHaveCSS(
    'background-color',
    'rgb(253, 161, 184)',
  )
  await expect(page.getByTestId('food-delivery-peach-cloud-nav-home')).toHaveCSS(
    'background-color',
    'rgb(253, 108, 147)',
  )
  await expect(page.getByTestId('food-delivery-peach-cloud-featured')).toHaveCSS(
    'background-color',
    'rgb(253, 108, 147)',
  )
  const [homeHeaderBox, homeMainBox, categoryRailBox] = await Promise.all([
    page.getByTestId('food-delivery-peach-cloud-home-header').boundingBox(),
    page.getByTestId('food-delivery-peach-cloud-home-main').boundingBox(),
    page.getByTestId('food-delivery-store-menu-section-rail').boundingBox(),
  ])
  expect(homeHeaderBox).not.toBeNull()
  expect(homeMainBox).not.toBeNull()
  expect(categoryRailBox).not.toBeNull()
  expect(homeMainBox.y).toBeGreaterThanOrEqual(homeHeaderBox.y + homeHeaderBox.height - 1)
  expect(categoryRailBox.y - homeMainBox.y).toBeGreaterThanOrEqual(0)
  expect(categoryRailBox.y - homeMainBox.y).toBeLessThanOrEqual(16)
  await testInfo.attach('peach-cloud-palette-home', {
    body: await page.screenshot(),
    contentType: 'image/png',
  })
  await expect(storeShell).toContainText('Peach Cloud')
  await expect(page.getByTestId('food-delivery-peach-cloud-featured')).toContainText(
    'Golden Hour Pairing',
  )
  await expect(page.locator('[data-testid^="food-delivery-menu-"][data-menu-section]')).toHaveCount(
    12,
  )
  await expectNoHorizontalOverflow(page)

  await page.getByTestId('food-delivery-peach-cloud-nav-cart').click()
  await expect(page).toHaveURL(/shopView=bag/)
  await expect(page.getByTestId('food-delivery-peach-cloud-bag-page')).toContainText(
    /购物袋轻飘飘的|Your bag feels light/,
  )
  await expect(page.getByTestId('food-delivery-peach-cloud-featured')).toHaveCount(0)

  await page.getByTestId('food-delivery-peach-cloud-nav-menu').click()
  await expect(page).toHaveURL(/shopView=search/)
  await expect(page.getByTestId('food-delivery-peach-cloud-search-page')).toBeVisible()
  await page.getByTestId('food-delivery-peach-cloud-nav-seasonal').click()
  await expect(page).toHaveURL(/shopView=new/)
  await expect(page.getByTestId('food-delivery-peach-cloud-new-page')).toBeVisible()
  await expect(page.getByTestId('food-delivery-peach-cloud-nav-seasonal')).toHaveCSS(
    'background-color',
    'rgb(253, 108, 147)',
  )
  await page.getByTestId('food-delivery-peach-cloud-nav-home').click()
  await expect(page).not.toHaveURL(/shopView=/)

  await page.getByTestId('food-delivery-store-menu-section-cloud_tea').click()
  await expect(page.getByTestId('food-delivery-store-menu-items')).toHaveAttribute(
    'data-active-section',
    'cloud_tea',
  )
  await expect(page.locator('[data-testid^="food-delivery-menu-"][data-menu-section]')).toHaveCount(
    4,
  )

  await page.getByTestId('food-delivery-menu-open-food_menu_peach_oolong_cloud').click()
  await expect(page.getByTestId('food-delivery-menu-detail-sheet')).toContainText(
    'Peach Oolong Cloud',
  )
  await page.getByTestId('food-delivery-menu-detail-quantity-increase').click()
  await expect(page.getByTestId('food-delivery-menu-detail-quantity')).toContainText('2')
  await page.getByTestId('food-delivery-menu-detail-add').click()
  await page.getByTestId('food-delivery-menu-detail-close').click()

  await page.getByTestId('food-delivery-peach-cloud-nav-cart').click()
  await expect(page).toHaveURL(/shopView=bag/)
  await expect(page.getByTestId('food-delivery-cart-panel')).toContainText('Peach Oolong Cloud')
  await expect(page.getByTestId('food-delivery-peach-cloud-nav')).toBeVisible()
  await page.getByTestId('food-delivery-checkout').click()
  await expect(page.getByTestId('food-delivery-checkout-sheet')).toContainText('Peach Cloud')
  await expect(page.getByTestId('food-delivery-checkout-sheet')).toContainText('Peach Oolong Cloud')
  await page.getByTestId('food-delivery-checkout-submit').click()

  await expect(page).toHaveURL(/shopView=order/)
  await expect(page).toHaveURL(/shopOrderId=/)
  await expect(page.getByTestId('food-delivery-peach-cloud-order-page')).toContainText(
    /本次点单|Your order/,
  )
  await page.getByTestId('food-delivery-peach-cloud-nav-orders').click()
  await expect(page).toHaveURL(/shopView=orders/)
  await expect(page.getByTestId('food-delivery-orders-panel')).toContainText('Peach Oolong Cloud')
  await expectNoHorizontalOverflow(page)

  expect(pageErrors).toEqual([])
})
