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
}) => {
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
  await expect(storeShell).toContainText('Peach Cloud')
  await expect(page.getByTestId('food-delivery-peach-cloud-featured')).toContainText(
    'Golden Hour Pairing',
  )
  await expect(page.locator('[data-testid^="food-delivery-menu-"][data-menu-section]')).toHaveCount(
    12,
  )
  await expectNoHorizontalOverflow(page)

  await page.getByTestId('food-delivery-peach-cloud-nav-cart').click()
  await expect(page.getByTestId('food-delivery-store-nav-feedback')).toContainText(
    /bag is empty|购物袋还是空的/,
  )

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

  await expect(page.getByTestId('food-delivery-cart-panel')).toContainText('Peach Oolong Cloud')
  await expect(page.getByTestId('food-delivery-peach-cloud-nav')).toBeVisible()
  await page.getByTestId('food-delivery-checkout').click()
  await expect(page.getByTestId('food-delivery-checkout-sheet')).toContainText('Peach Cloud')
  await expect(page.getByTestId('food-delivery-checkout-sheet')).toContainText('Peach Oolong Cloud')
  await page.getByTestId('food-delivery-checkout-submit').click()

  const supportDrawer = page.getByTestId('food-delivery-store-support-drawer')
  await expect(supportDrawer).toBeVisible()
  await supportDrawer.locator('summary').click()
  await expect(page.getByTestId('food-delivery-orders-panel')).toContainText('Peach Cloud')
  await expectNoHorizontalOverflow(page)

  expect(pageErrors).toEqual([])
})
