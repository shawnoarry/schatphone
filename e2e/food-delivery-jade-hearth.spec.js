import { expect, test } from '@playwright/test'
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
  await expect(page.getByTestId('food-delivery-jade-hero')).toContainText(
    /一席热菜，慢慢分享。|Gather around something warm\./,
  )
  await expect(page.getByTestId('food-delivery-jade-nav')).toBeVisible()

  const heroImage = page.getByTestId('food-delivery-jade-hero').locator('img')
  await expect(heroImage).toHaveAttribute(
    'data-required-asset',
    'jade-hearth/cover/jade-hearth-cover-01.png',
  )
  await expect(heroImage).toHaveAttribute('data-asset-missing', 'true')

  const addressButton = page.getByTestId('food-delivery-jade-address')
  await expect(addressButton).toHaveAttribute('aria-expanded', 'false')
  await addressButton.click()
  await expect(addressButton).toHaveAttribute('aria-expanded', 'true')

  await testInfo.attach(`jade-hearth-home-${testInfo.project.name}`, {
    body: await page.screenshot(),
    contentType: 'image/png',
  })
  await expectNoHorizontalOverflow(page)

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

  await page.getByTestId('food-delivery-menu-open-food_menu_jade_tea_smoked_chicken').click()
  await expect(page.getByTestId('food-delivery-menu-detail-sheet')).toContainText(
    'Tea-Smoked Half Chicken',
  )
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
    'Tea-Smoked Half Chicken',
  )
  await page.getByTestId('food-delivery-checkout').click()
  await expect(page.getByTestId('food-delivery-checkout-sheet')).toContainText('Jade Hearth')
  await page.getByTestId('food-delivery-checkout-submit').click()

  await expect(page).toHaveURL(/shopView=order/)
  await expect(page).toHaveURL(/shopOrderId=/)
  await expect(page.getByTestId('food-delivery-jade-order-page')).toContainText(
    'Tea-Smoked Half Chicken',
  )
  await expect(page.getByTestId('food-delivery-jade-nav-orders')).toHaveAttribute(
    'aria-current',
    'page',
  )
  const orderId = new URL(page.url()).hash.match(/shopOrderId=([^&]+)/)?.[1] || ''
  expect(orderId).not.toBe('')
  await expect(page.getByTestId(`food-delivery-jade-check-update-${orderId}`)).toBeVisible()
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
