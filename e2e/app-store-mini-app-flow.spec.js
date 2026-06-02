import { expect, test } from '@playwright/test'

const unlockToHome = async (page) => {
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

  await page.goto('/#/lock')
  await page.locator('.lock-unlock-button').click()
  await expect(page).toHaveURL(/#\/home/)
  await expect(page.locator('.home-dock')).toBeVisible()
}

const navigateInsideUnlockedApp = async (page, hashPath) => {
  await page.evaluate((target) => {
    window.location.hash = target
  }, hashPath)
}

const getVisibleAction = async (page, inlineTestId, sheetTestId = `${inlineTestId}-sheet`) => {
  const inlineAction = page.getByTestId(inlineTestId)
  if (await inlineAction.isVisible()) return inlineAction
  return page.getByTestId(sheetTestId)
}

const clickVisibleAction = async (page, inlineTestId, sheetTestId) => {
  await (await getVisibleAction(page, inlineTestId, sheetTestId)).click()
}

const expectNoHorizontalOverflow = async (page) => {
  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  )
  expect(hasHorizontalOverflow).toBe(false)
}

test.use({ viewport: { width: 390, height: 844 } })

test('mobile App Store mini apps hand off to Food Delivery and Shopping without deleting source records', async ({
  page,
}) => {
  const pageErrors = []
  page.on('pageerror', (error) => {
    pageErrors.push(error.message)
  })

  await unlockToHome(page)

  await navigateInsideUnlockedApp(page, '/app-store?section=shops&homePage=2')
  await expect(page).toHaveURL(/#\/app-store/)
  await expect(page.getByTestId('app-store-filter-shop')).toHaveClass(/is-active/)
  await expect(page.getByTestId('app-store-shop-controls')).toContainText('mini app entries')
  await expectNoHorizontalOverflow(page)

  await page.getByTestId('app-store-shop-create').click()
  await expect(page.getByTestId('app-store-shop-create-sheet')).toBeVisible()
  await expect(page.getByTestId('app-store-shop-create-boundary')).toContainText('Food Delivery owns')
  await page.getByTestId('app-store-shop-create-open-target').click()
  await expect(page).toHaveURL(/#\/food-delivery\?/)
  await expect(page).toHaveURL(/createShop=1/)
  await expect(page).toHaveURL(/bindingTarget=food_delivery/)
  await expect(page.getByTestId('food-delivery-app-store-create-banner')).toContainText(
    'Food Delivery creates the real restaurant',
  )
  await expectNoHorizontalOverflow(page)

  await navigateInsideUnlockedApp(page, '/app-store?section=shops&homePage=2')
  await page.getByTestId('app-store-shop-create').click()
  await page.getByTestId('app-store-shop-create-target').selectOption('shopping')
  await expect(page.getByTestId('app-store-shop-create-boundary')).toContainText('Shopping owns')
  await page.getByTestId('app-store-shop-create-open-target').click()
  await expect(page).toHaveURL(/#\/shopping\?/)
  await expect(page).toHaveURL(/createShop=1/)
  await expect(page).toHaveURL(/bindingTarget=shopping/)
  await expect(page.getByTestId('shopping-app-store-create-banner')).toContainText('Shopping owns products')
  await expectNoHorizontalOverflow(page)

  await navigateInsideUnlockedApp(page, '/app-store?section=shops&homePage=2')
  await page.getByTestId('app-store-item-shop_app_food_seed_moon_bistro').click()
  await expect(await getVisibleAction(page, 'app-store-entry-boundary')).toContainText(
    'Food Delivery owns restaurants',
  )
  await expect(await getVisibleAction(page, 'app-store-shop-app-meta')).toContainText('Installed')

  await clickVisibleAction(page, 'app-store-shop-folder-toggle')
  await expect(await getVisibleAction(page, 'app-store-shop-app-meta')).toContainText('Not installed')
  await clickVisibleAction(page, 'app-store-open')
  await expect(page).toHaveURL(/#\/food-delivery\?/)
  await expect(page).toHaveURL(/restaurantId=food_seed_moon_bistro/)
  await expect(page.getByTestId('food-delivery-store-shell')).toContainText('Moon Bistro')

  await navigateInsideUnlockedApp(page, '/food-delivery?category=restaurants')
  await expect(page.getByTestId('food-delivery-pseudo-folder-home')).toBeVisible()
  await expect(page.getByTestId('food-delivery-shop-app-food_seed_moon_bistro')).toHaveCount(0)

  await navigateInsideUnlockedApp(page, '/app-store?section=shops&homePage=2')
  await page.getByTestId('app-store-item-shop_app_shopping_daily_fresh').click()
  await expect(await getVisibleAction(page, 'app-store-entry-boundary')).toContainText('Shopping owns products')
  await expect(await getVisibleAction(page, 'app-store-shop-app-meta')).toContainText('Shopping')

  await clickVisibleAction(page, 'app-store-shop-folder-toggle')
  await expect(await getVisibleAction(page, 'app-store-shop-app-meta')).toContainText('Not installed')
  await clickVisibleAction(page, 'app-store-open')
  await expect(page).toHaveURL(/#\/shopping\?/)
  await expect(page).toHaveURL(/service=daily_fresh/)
  await expect(page).toHaveURL(/shopEntryId=shop_app_shopping_daily_fresh/)
  await expect(page.locator('h1')).toContainText('Daily Fresh')

  await navigateInsideUnlockedApp(page, '/shopping')
  await expect(page.getByTestId('shopping-service-daily_fresh')).toHaveCount(0)
  await expect(page.getByTestId('shopping-service-schat_mall')).toBeVisible()
  await expectNoHorizontalOverflow(page)

  expect(pageErrors).toEqual([])
})
