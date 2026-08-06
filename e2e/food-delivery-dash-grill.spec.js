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
    { length: 10 },
    (_, index) => `dash-grill/products/dash-grill-item-${String(index + 1).padStart(2, '0')}.png`,
  )
  const deliveredProductAssetResults = await page.evaluate(async (assetPaths) => {
    return Promise.all(
      assetPaths.map(
        (assetPath) =>
          new Promise((resolve) => {
            const image = new Image()
            image.onload = () =>
              resolve({ assetPath, loaded: image.naturalWidth > 0 && image.naturalHeight > 0 })
            image.onerror = () => resolve({ assetPath, loaded: false })
            image.src = new URL(
              `images/ui-assets/apps/food-delivery/${assetPath}`,
              document.baseURI,
            ).href
          }),
      ),
    )
  }, deliveredProductAssets)
  expect(deliveredProductAssetResults).toEqual(
    deliveredProductAssets.map((assetPath) => ({ assetPath, loaded: true })),
  )

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
  await expect(page.getByTestId('food-delivery-store-menu-section-featured')).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await expect(page.getByTestId('food-delivery-store-menu-section-all')).toHaveCount(0)
  await expect(page.getByTestId('food-delivery-store-menu-section-rail')).toHaveAttribute(
    'tabindex',
    '0',
  )
  await expect(
    page.getByTestId('food-delivery-dash-ticket-food_menu_dash_double_stack'),
  ).toHaveAttribute('data-menu-card-style', 'order-ticket')
  await testInfo.attach(`dash-grill-menu-${testInfo.project.name}`, {
    body: await page.screenshot(),
    contentType: 'image/png',
  })
  await expectNoHorizontalOverflow(page)

  await page.getByTestId('food-delivery-menu-open-food_menu_dash_double_stack').click()
  await expect(page.getByTestId('food-delivery-menu-detail-sheet')).toContainText(
    /达什双层牛肉堡套餐|Dash Double Stack Combo/,
  )
  await expect(page.getByTestId('food-delivery-dash-detail-ticket')).toHaveAttribute(
    'data-detail-layout',
    'tray-ticket',
  )
  await expect(page.getByTestId('food-delivery-dash-detail-ticket')).toContainText('#01')
  const detailImage = page
    .getByTestId('food-delivery-menu-detail-sheet')
    .locator('[data-required-asset="dash-grill/products/dash-grill-item-01.png"]')
  await expect(detailImage).toBeVisible()
  await expect(detailImage).not.toHaveAttribute('data-asset-missing', 'true')
  await expect(page.getByTestId('food-delivery-dash-selection-progress')).toContainText('2/2')
  await expect(
    page
      .getByTestId('food-delivery-dash-combo-side-sea_salt_fries')
      .locator('[data-required-asset="dash-grill/products/dash-grill-item-06.png"]'),
  ).toBeVisible()
  await testInfo.attach(`dash-grill-detail-${testInfo.project.name}`, {
    body: await page.screenshot(),
    contentType: 'image/png',
  })
  await expectNoHorizontalOverflow(page)
  await page.getByTestId('food-delivery-dash-combo-side-loaded_cheese_fries').click()
  await page.getByTestId('food-delivery-dash-combo-drink-vanilla_cloud_shake').click()
  await expect(page.getByTestId('food-delivery-dash-selection-summary')).toContainText(
    /浓芝士薯条 · 香草云奶昔|Loaded Cheese Fries · Vanilla Cloud Shake/,
  )
  await expect(page.getByTestId('food-delivery-menu-detail-total')).toContainText('56.00 CNY')
  await page.getByTestId('food-delivery-menu-detail-quantity-increase').click()
  await expect(page.getByTestId('food-delivery-menu-detail-quantity')).toContainText('2')
  await expect(page.getByTestId('food-delivery-menu-detail-total')).toContainText('112.00 CNY')
  await page.getByTestId('food-delivery-menu-detail-add').click()
  await page.getByTestId('food-delivery-menu-detail-close').click()

  await page.getByTestId('food-delivery-store-menu-section-chicken').click()
  await page.getByTestId('food-delivery-add-food_menu_dash_chicken_tenders').click()
  await expect(page.getByTestId('food-delivery-dash-sauce-builder')).toBeVisible()
  await expect(page.getByTestId('food-delivery-dash-selection-progress')).toContainText('1/1')
  await page.getByTestId('food-delivery-dash-sauce-smoky_bbq_sauce').click()
  await expect(page.getByTestId('food-delivery-dash-selection-summary')).toContainText(
    /烟熏烧烤酱|Smoky BBQ Sauce/,
  )
  await page.getByTestId('food-delivery-menu-detail-add').click()
  await page.getByTestId('food-delivery-menu-detail-close').click()

  await page.getByTestId('food-delivery-quick-service-header-bag').click()
  await expect(page).toHaveURL(/shopView=bag/)
  await expect(page.getByTestId('food-delivery-cart-panel')).toContainText(
    /浓芝士薯条 · 香草云奶昔|Loaded Cheese Fries · Vanilla Cloud Shake/,
  )
  await expect(page.getByTestId('food-delivery-cart-panel')).toContainText(
    /烟熏烧烤酱|Smoky BBQ Sauce/,
  )
  await page.getByTestId('food-delivery-checkout').click()
  await expect(page.getByTestId('food-delivery-checkout-sheet')).toContainText('Dash Grill')
  await page.getByTestId('food-delivery-checkout-submit').click()

  await expect(page).toHaveURL(/shopView=order/)
  await expect(page).toHaveURL(/shopOrderId=/)
  await expect(page.getByTestId('food-delivery-quick-service-order-page')).toContainText(
    /达什双层牛肉堡套餐|Dash Double Stack Combo/,
  )
  await expect(page.getByTestId('food-delivery-quick-service-order-page')).toContainText(
    /浓芝士薯条 · 香草云奶昔|Loaded Cheese Fries · Vanilla Cloud Shake/,
  )
  await expect(page.getByTestId('food-delivery-quick-service-order-page')).toContainText(
    /烟熏烧烤酱|Smoky BBQ Sauce/,
  )
  await expect(page.getByTestId('food-delivery-quick-service-nav-orders')).toHaveAttribute(
    'aria-current',
    'page',
  )
  await expectNoHorizontalOverflow(page)

  expect(pageErrors).toEqual([])
})
