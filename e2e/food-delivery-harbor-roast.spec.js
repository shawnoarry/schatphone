import { expect, test } from '@playwright/test'
import { navigateInsideUnlockedApp, unlockToHome } from './helpers/navigation.js'

test('Harbor Roast opens a complete base storefront and App Store identity entry', async ({
  page,
}) => {
  await unlockToHome(page)
  await navigateInsideUnlockedApp(
    page,
    '/food-delivery?category=cafe&restaurantId=food_seed_harbor_roast&entry=shop',
  )

  const storeShell = page.getByTestId('food-delivery-store-shell')
  await expect(storeShell).toHaveAttribute('data-store-template', 'standard')
  await expect(storeShell).toContainText('Harbor Roast')
  await expect(page.locator('[data-testid^="food-delivery-menu-open-"]')).toHaveCount(12)
  await expect(page.getByTestId('food-delivery-store-menu-section-espresso_classics')).toBeVisible()
  await expect(page.getByTestId('food-delivery-store-menu-section-harbor_signatures')).toBeVisible()
  await expect(page.getByTestId('food-delivery-store-menu-section-cold_blended')).toBeVisible()
  await expect(page.getByTestId('food-delivery-store-menu-section-tea_counter_bakes')).toBeVisible()

  await page.getByTestId('food-delivery-menu-open-food_menu_harbor_sea_salt_caramel_latte').click()
  await expect(page.getByTestId('food-delivery-menu-detail-sheet')).toContainText(
    'Sea-Salt Caramel Latte',
  )

  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  )
  expect(hasHorizontalOverflow).toBe(false)

  await navigateInsideUnlockedApp(page, '/app-store?section=shops')
  await page.getByTestId('app-store-item-shop_app_food_seed_harbor_roast').click()
  await expect(page.getByTestId('app-store-shop-app-meta')).toContainText(
    'Espresso, signature drinks, tea, and counter bakes',
  )
  await expect(
    page.locator(
      '[data-testid="app-store-open-identity"]:visible, [data-testid="app-store-open-identity-sheet"]:visible',
    ),
  ).toBeVisible()
})
