import { expect, test } from '@playwright/test'
import { navigateInsideUnlockedApp, unlockToHome } from './helpers/navigation.js'

test('Harbor Roast runs its branded campaigns, dine-in checkout, and order detail', async ({
  page,
}, testInfo) => {
  await unlockToHome(page)
  await navigateInsideUnlockedApp(
    page,
    '/food-delivery?category=cafe&restaurantId=food_seed_harbor_roast&entry=shop',
  )

  const storeShell = page.getByTestId('food-delivery-store-shell')
  await expect(storeShell).toHaveAttribute('data-store-template', 'harbor_roast_chain')
  await expect(storeShell).toContainText('Harbor Roast')
  await expect(page.getByTestId('food-delivery-harbor-carousel')).toBeVisible()
  await expect(page.locator('[data-testid^="food-delivery-harbor-campaign-"]')).toHaveCount(3)
  const homeAssets = page.locator('[data-required-asset^="harbor-roast/"]')
  await expect(homeAssets).toHaveCount(8)
  await expect
    .poll(() =>
      homeAssets.evaluateAll((images) =>
        images
          .filter((image) => !image.complete || image.naturalWidth === 0)
          .map((image) => image.getAttribute('data-required-asset')),
      ),
    )
    .toEqual([])

  await testInfo.attach(`harbor-roast-${testInfo.project.name}`, {
    body: await page.screenshot(),
    contentType: 'image/png',
  })

  for (const campaign of ['member', 'new', 'passport']) {
    await page
      .getByTestId(`food-delivery-harbor-campaign-${campaign}`)
      .evaluate((button) => button.click())
    await expect(page.getByTestId(`food-delivery-harbor-${campaign}-page`)).toBeVisible()
    await expect(page).toHaveURL(new RegExp(`shopView=${campaign}`))
    const poster = page.locator('.harbor-campaign-poster')
    await expect(poster).toBeVisible()
    await expect.poll(() => poster.evaluate((image) => image.naturalWidth)).toBe(1200)
    await page.getByTestId('food-delivery-store-home').click()
  }

  await page.getByTestId('food-delivery-harbor-supply-entry').click()
  await expect(page.getByTestId('food-delivery-harbor-supply-page')).toBeVisible()
  await expect(page).toHaveURL(/shopView=supply/)
  await expect(page.locator('[data-testid^="food-delivery-harbor-merchandise-"]')).toHaveCount(4)
  const supplyAssets = page.locator('[data-required-asset^="harbor-roast/merchandise/"]')
  await expect(supplyAssets).toHaveCount(5)
  await expect
    .poll(() =>
      supplyAssets.evaluateAll((images) =>
        images
          .filter((image) => !image.complete || image.naturalWidth === 0)
          .map((image) => image.getAttribute('data-required-asset')),
      ),
    )
    .toEqual([])
  await expect(
    page.getByTestId('food-delivery-harbor-redeem-harbor_merch_captain_mug'),
  ).toBeDisabled()
  await expect(
    page.getByTestId('food-delivery-harbor-redeem-harbor_merch_captain_mug'),
  ).toContainText(/还差 1 枚|1 short/)
  await page.getByTestId('food-delivery-harbor-redeem-harbor_merch_anchor_pin').click()
  await expect(page.getByTestId('food-delivery-harbor-merchandise-feedback')).toContainText(
    /兑换成功|Redeemed/,
  )
  await page.getByTestId('food-delivery-harbor-buy-harbor_merch_canvas_tote').click()

  await page
    .getByTestId('food-delivery-harbor-merchandise-harbor_merch_sticker_pack')
    .locator('.harbor-merch-image')
    .click()
  await expect(page.getByTestId('food-delivery-harbor-supply-detail-page')).toBeVisible()
  await expect(page).toHaveURL(/shopView=supply-detail/)
  await expect(page).toHaveURL(/shopMerchId=harbor_merch_sticker_pack/)

  await testInfo.attach(`harbor-roast-supply-${testInfo.project.name}`, {
    body: await page.screenshot(),
    contentType: 'image/png',
  })

  await page.getByTestId('food-delivery-store-home').click()
  await page.getByTestId('food-delivery-store-home').click()

  await page.getByTestId('food-delivery-harbor-nav-menu').click()
  await expect(page.getByTestId('food-delivery-harbor-menu-page')).toBeVisible()
  await expect(page.getByTestId('food-delivery-store-menu-section-all')).toHaveCount(0)
  await expect(page.getByTestId('food-delivery-store-menu-section-espresso_classics')).toBeVisible()
  await expect(page.getByTestId('food-delivery-store-menu-section-harbor_signatures')).toBeVisible()
  await expect(page.getByTestId('food-delivery-store-menu-section-cold_blended')).toBeVisible()
  await expect(page.getByTestId('food-delivery-store-menu-section-tea_counter_bakes')).toBeVisible()

  await page.getByTestId('food-delivery-store-menu-section-harbor_signatures').click()
  await page.getByTestId('food-delivery-menu-open-food_menu_harbor_sea_salt_caramel_latte').click()
  await expect(page.getByTestId('food-delivery-harbor-detail-page')).toContainText(
    'Sea-Salt Caramel Latte',
  )

  await testInfo.attach(`harbor-roast-detail-${testInfo.project.name}`, {
    body: await page.screenshot(),
    contentType: 'image/png',
  })

  await page.getByTestId('food-delivery-harbor-detail-add').click()
  await page.getByTestId('food-delivery-harbor-header-bag').click()
  await expect(page.getByTestId('food-delivery-harbor-bag-page')).toContainText(
    'Sea-Salt Caramel Latte',
  )
  await page.getByTestId('food-delivery-harbor-pickup-dine-in').click()
  await page.getByTestId('food-delivery-checkout').click()
  await expect(page.getByTestId('food-delivery-harbor-checkout-sheet')).toContainText(
    /到店堂食|Dine in/,
  )
  await expect(page.getByTestId('food-delivery-checkout-sheet')).toHaveCount(0)
  await page.getByTestId('food-delivery-harbor-checkout-submit').click()
  await expect(page.getByTestId('food-delivery-harbor-order-page')).toContainText(
    /到店堂食|Dine in/,
  )
  await expect(page).toHaveURL(/shopView=order/)
  await expect(page).toHaveURL(/shopOrderId=food_order_/)
  const orderIllustration = page.getByTestId('food-delivery-harbor-order-illustration')
  await expect(orderIllustration).toBeVisible()
  await expect.poll(() => orderIllustration.evaluate((image) => image.naturalWidth)).toBe(1024)

  await testInfo.attach(`harbor-roast-order-${testInfo.project.name}`, {
    body: await page.screenshot(),
    contentType: 'image/png',
  })

  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  )
  expect(hasHorizontalOverflow).toBe(false)

  await navigateInsideUnlockedApp(page, '/app-store?section=shops')
  const harborAppStoreItem = page.getByTestId('app-store-item-shop_app_food_seed_harbor_roast')
  await expect(harborAppStoreItem.locator('img')).toHaveAttribute(
    'src',
    /harbor-roast-app-icon-01\.png$/,
  )
  await harborAppStoreItem.click()
  await expect(page.getByTestId('app-store-shop-app-meta')).toContainText(
    'Espresso, signature drinks, tea, and counter bakes',
  )
  await expect(
    page.locator(
      '[data-testid="app-store-open-identity"]:visible, [data-testid="app-store-open-identity-sheet"]:visible',
    ),
  ).toBeVisible()
  await expect(
    page.locator(
      '[data-testid="app-store-shop-cover"]:visible img, [data-testid="app-store-shop-cover-sheet"]:visible img',
    ),
  ).toHaveAttribute('src', /harbor-roast-cover-01\.png$/)
})
