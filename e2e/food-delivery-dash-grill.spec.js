import { expect, test } from '@playwright/test'
import { navigateInsideUnlockedApp, unlockToHome } from './helpers/navigation.js'

const expectNoHorizontalOverflow = async (page) => {
  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  )
  expect(hasHorizontalOverflow).toBe(false)
}

test('Dash Grill keeps its quick-service identity through menu, bag, checkout, and order review', async ({
  page,
}, testInfo) => {
  const pageErrors = []
  page.on('pageerror', (error) => {
    pageErrors.push(error.message)
  })

  await unlockToHome(page)
  await navigateInsideUnlockedApp(
    page,
    '/food-delivery?category=fast_food&restaurantId=food_seed_dash_grill&entry=shop',
  )

  const storeShell = page.getByTestId('food-delivery-store-shell')
  await expect(storeShell).toHaveAttribute('data-store-template', 'quick_service_chain')
  await expect(page.getByTestId('food-delivery-view')).toHaveCSS(
    'background-color',
    'rgb(255, 249, 236)',
  )
  await expect(page.getByTestId('food-delivery-quick-service-hero')).toContainText(
    /趁热开吃|BUILT FAST\. SERVED HOT\./,
  )
  await expect(page.getByTestId('food-delivery-quick-service-nav')).toBeVisible()

  const heroImage = page.getByTestId('food-delivery-quick-service-hero').locator('img')
  await expect(heroImage).toHaveAttribute(
    'data-required-asset',
    'dash-grill/cover/dash-grill-cover-01.png',
  )
  await expect(heroImage).toHaveAttribute('data-asset-missing', 'true')

  const addressButton = page.getByTestId('food-delivery-quick-service-address')
  await expect(addressButton).toHaveAttribute('aria-expanded', 'false')
  await addressButton.click()
  await expect(addressButton).toHaveAttribute('aria-expanded', 'true')
  await expect(page.getByTestId('food-delivery-quick-service-address-panel')).toBeVisible()

  await testInfo.attach(`dash-grill-home-${testInfo.project.name}`, {
    body: await page.screenshot(),
    contentType: 'image/png',
  })
  await expectNoHorizontalOverflow(page)

  await page.getByTestId('food-delivery-quick-service-nav-deals').click()
  await expect(page).toHaveURL(/shopView=deals/)
  await expect(page.getByTestId('food-delivery-quick-service-deals-page')).toContainText(
    /每一口都更划算|MORE BITE FOR YOUR BUCK/,
  )

  await page.getByTestId('food-delivery-quick-service-nav-menu').click()
  await expect(page).toHaveURL(/shopView=menu/)
  await expect(page.getByTestId('food-delivery-quick-service-menu-page')).toBeVisible()
  await expect(page.getByTestId('food-delivery-store-menu-section-all')).toHaveAttribute(
    'aria-pressed',
    'true',
  )

  await page.getByTestId('food-delivery-menu-open-food_menu_dash_double_stack').click()
  await expect(page.getByTestId('food-delivery-menu-detail-sheet')).toContainText(
    'Dash Double Stack',
  )
  await page.getByTestId('food-delivery-menu-detail-quantity-increase').click()
  await expect(page.getByTestId('food-delivery-menu-detail-quantity')).toContainText('2')
  await page.getByTestId('food-delivery-menu-detail-add').click()
  await page.getByTestId('food-delivery-menu-detail-close').click()

  await page.getByTestId('food-delivery-quick-service-header-bag').click()
  await expect(page).toHaveURL(/shopView=bag/)
  await expect(page.getByTestId('food-delivery-cart-panel')).toContainText('Dash Double Stack')
  await page.getByTestId('food-delivery-checkout').click()
  await expect(page.getByTestId('food-delivery-checkout-sheet')).toContainText('Dash Grill')
  await page.getByTestId('food-delivery-checkout-submit').click()

  await expect(page).toHaveURL(/shopView=order/)
  await expect(page).toHaveURL(/shopOrderId=/)
  await expect(page.getByTestId('food-delivery-quick-service-order-page')).toContainText(
    'Dash Double Stack',
  )
  await expect(page.getByTestId('food-delivery-quick-service-nav-orders')).toHaveAttribute(
    'aria-current',
    'page',
  )
  await expectNoHorizontalOverflow(page)

  expect(pageErrors).toEqual([])
})
