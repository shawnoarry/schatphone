import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { navigateInsideUnlockedApp, unlockToHome } from './helpers/navigation.js'

const FOOD_DELIVERY_STORAGE_KEY = 'schatphone:store:food-delivery'

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

const readPersistedFoodDelivery = async (page) =>
  page.evaluate((storageKey) => window.localStorage.getItem(storageKey), FOOD_DELIVERY_STORAGE_KEY)

const openFoodDeliveryFolderEntry = async (page, entryId) => {
  await page.getByTestId('home-folder-app_food_delivery').click()
  await expect(page.getByTestId('home-folder-overlay')).toBeVisible()
  await page.getByTestId(`home-folder-entry-${entryId}`).click()
}

test('independent shops keep separate carts from Home through Peach order detail', async ({
  page,
}, testInfo) => {
  const pageErrors = []
  page.on('pageerror', (error) => pageErrors.push(error.message))

  await page.addInitScript(() => {
    window.localStorage.setItem(
      'schatphone:store:system',
      JSON.stringify({
        version: 1,
        savedAt: Date.now(),
        data: {
          settings: {
            system: {
              language: 'en-US',
            },
          },
        },
      }),
    )
  })

  await unlockToHome(page)
  await navigateInsideUnlockedApp(page, '/home?homePage=1')
  await openFoodDeliveryFolderEntry(page, 'shop_app_food_seed_moon_bistro')
  await expect(page).toHaveURL(/restaurantId=food_seed_moon_bistro/)
  await expect(page).toHaveURL(/from=home/)
  await expect(page).toHaveURL(/homePage=1/)

  const moonAdd = page.locator('[data-testid^="food-delivery-add-"]').first()
  const moonItemTitle = (await moonAdd.getAttribute('aria-label')).replace(/^Add /, '')
  const moonItemId = (await moonAdd.getAttribute('data-testid')).replace('food-delivery-add-', '')
  await moonAdd.click()
  await expect(page.getByTestId('food-delivery-cart-panel')).toContainText(moonItemTitle)

  await page.getByTestId('food-delivery-store-home').click()
  await expect(page).toHaveURL(/#\/home\?homePage=1$/)
  await openFoodDeliveryFolderEntry(page, 'shop_app_food_seed_harbor_roast')
  await expect(page).toHaveURL(/restaurantId=food_seed_harbor_roast/)
  await expect(page.getByTestId('food-delivery-foreign-cart-notice')).toHaveCount(0)
  await expect(page.getByTestId('food-delivery-cart-panel')).toHaveCount(0)
  await expect(page.getByTestId('food-delivery-store-shell')).not.toContainText(moonItemTitle)

  const harborAdd = page.locator('[data-testid^="food-delivery-add-"]').first()
  const harborItemTitle = (await harborAdd.getAttribute('aria-label')).replace(/^Add /, '')
  const harborItemId = (await harborAdd.getAttribute('data-testid')).replace(
    'food-delivery-add-',
    '',
  )
  await harborAdd.click()
  await expect(page.getByTestId('food-delivery-cart-replacement-dialog')).toHaveCount(0)
  await expect(page.getByTestId('food-delivery-cart-panel')).toContainText(harborItemTitle)
  await expect(page.getByTestId('food-delivery-store-shell')).not.toContainText(moonItemTitle)

  await page.getByTestId('food-delivery-store-home').click()
  await expect(page).toHaveURL(/#\/home\?homePage=1$/)
  await openFoodDeliveryFolderEntry(page, 'shop_app_food_seed_peach_cloud')
  await expect(page).toHaveURL(/restaurantId=food_seed_peach_cloud/)
  await page.getByTestId('food-delivery-peach-cloud-nav-cart').click()

  await expect(page.getByTestId('food-delivery-foreign-cart-notice')).toHaveCount(0)
  await expect(page.getByTestId('food-delivery-peach-cloud-bag-page')).toContainText(
    'Your bag feels light',
  )
  await expect(page.getByTestId('food-delivery-peach-cloud-bag-page')).not.toContainText(
    moonItemTitle,
  )
  await expect(page.getByTestId('food-delivery-peach-cloud-bag-page')).not.toContainText(
    harborItemTitle,
  )
  await expectNoHorizontalOverflow(page)

  await page.getByTestId('food-delivery-peach-cloud-nav-menu').click()
  const peachAdd = page.locator('[data-testid^="food-delivery-add-"]').first()
  const peachItemTitle = (await peachAdd.getAttribute('aria-label')).replace(/^Add /, '')
  const peachItemId = (await peachAdd.getAttribute('data-testid')).replace(
    'food-delivery-add-',
    '',
  )
  await peachAdd.click()
  await expect(page.getByTestId('food-delivery-cart-replacement-dialog')).toHaveCount(0)

  await page.getByTestId('food-delivery-peach-cloud-nav-cart').click()
  await expect(page.getByTestId('food-delivery-foreign-cart-notice')).toHaveCount(0)
  await expect(page.getByTestId('food-delivery-cart-panel')).toContainText(peachItemTitle)
  await expect(page.getByTestId('food-delivery-cart-panel')).not.toContainText(moonItemTitle)
  await expect(page.getByTestId('food-delivery-cart-panel')).not.toContainText(harborItemTitle)
  await expect(page.getByTestId('food-delivery-peach-cloud-bag-page')).toContainText('1')
  await expectNoCriticalAxeViolations(page)
  await expectNoHorizontalOverflow(page)

  await page.getByTestId('food-delivery-checkout').click()
  await expect(page.getByTestId('food-delivery-checkout-sheet')).toContainText('Peach Cloud')
  await expect(page.getByTestId('food-delivery-checkout-sheet')).toContainText(peachItemTitle)
  await page.getByTestId('food-delivery-checkout-submit').click()

  await expect(page).toHaveURL(/shopView=order/)
  await expect(page).toHaveURL(/shopOrderId=/)
  await expect(page).toHaveURL(/from=home/)
  await expect(page).toHaveURL(/homePage=1/)
  await expect(page.getByTestId('food-delivery-peach-cloud-order-page')).toContainText(
    peachItemTitle,
  )
  await expect(page.getByTestId('food-delivery-peach-cloud-progress-1')).toHaveAttribute(
    'data-active',
    'true',
  )
  await expect(page.getByTestId('food-delivery-peach-cloud-progress-2')).toHaveAttribute(
    'data-active',
    'false',
  )
  const persistedAfterPeachCheckout = JSON.parse(await readPersistedFoodDelivery(page))
  const remainingCartIds = persistedAfterPeachCheckout.data.cartItems.map(
    (item) => item.menuItemId,
  )
  expect(remainingCartIds).toContain(moonItemId)
  expect(remainingCartIds).toContain(harborItemId)
  expect(remainingCartIds).not.toContain(peachItemId)
  await expectNoCriticalAxeViolations(page)
  await expectNoHorizontalOverflow(page)

  await testInfo.attach(`shop-cart-ownership-${testInfo.project.name}`, {
    body: await page.screenshot(),
    contentType: 'image/png',
  })

  await page.getByTestId('food-delivery-peach-cloud-nav-home').click()
  await page.getByTestId('food-delivery-store-home').click()
  await expect(page).toHaveURL(/#\/home\?homePage=1$/)
  expect(pageErrors).toEqual([])
})
