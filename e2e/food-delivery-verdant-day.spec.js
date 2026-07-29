import { expect, test } from '@playwright/test'
import { expectHomeReady, navigateInsideUnlockedApp, unlockToHome } from './helpers/navigation.js'

const expectNoHorizontalOverflow = async (page) => {
  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  )
  expect(hasHorizontalOverflow).toBe(false)
}

test('Verdant Day keeps its minimalist light-food identity through detail, bag, checkout, and order review', async ({
  page,
}, testInfo) => {
  const pageErrors = []
  page.on('pageerror', (error) => {
    pageErrors.push(error.message)
  })

  await unlockToHome(page)
  await navigateInsideUnlockedApp(
    page,
    '/food-delivery?category=restaurants&restaurantId=food_seed_verdant_day&entry=shop',
  )

  const storeShell = page.getByTestId('food-delivery-store-shell')
  await expect(storeShell).toHaveAttribute('data-store-template', 'minimal_light_food')
  await expect(page.getByTestId('food-delivery-view')).toHaveCSS(
    'background-color',
    'rgb(242, 244, 239)',
  )
  await expect(page.getByTestId('food-delivery-light-brand-hero')).toHaveText('')
  await expect(page.getByTestId('food-delivery-light-nav')).toBeVisible()

  const heroImage = page.getByTestId('food-delivery-light-hero-image')
  await expect(heroImage).toHaveAttribute(
    'data-required-asset',
    'verdant-day/brand/verdant-day-brand-hero-preview-02.png',
  )
  await expect(heroImage).toHaveAttribute('alt', /Eat bright\. Feel light\./)
  await expect(heroImage).not.toHaveAttribute('data-asset-missing', 'true')
  await expect
    .poll(() =>
      heroImage.evaluate(
        (image) =>
          image.complete && image.naturalWidth > 0 && image.dataset.fallbackApplied !== 'true',
      ),
    )
    .toBe(true)

  const featuredProductAssets = [
    'verdant-day/products/verdant-day-item-01.png',
    'verdant-day/products/verdant-day-item-04.png',
    'verdant-day/products/verdant-day-item-07.png',
  ]
  for (const assetPath of featuredProductAssets) {
    const productImage = page.locator(`[data-required-asset="${assetPath}"]`)
    await expect(productImage).toHaveCount(1)
    await expect(productImage).not.toHaveAttribute('data-asset-missing', 'true')
    await expect
      .poll(() =>
        productImage.evaluate(
          (image) =>
            image.complete && image.naturalWidth > 0 && image.dataset.fallbackApplied !== 'true',
        ),
      )
      .toBe(true)
  }

  const deliveredProductAssets = Array.from(
    { length: 12 },
    (_, index) => `verdant-day/products/verdant-day-item-${String(index + 1).padStart(2, '0')}.png`,
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

  const homeCategoryState = await page
    .getByTestId('food-delivery-store-menu-section-rail')
    .evaluate((rail) => ({
      buttonCount: rail.querySelectorAll('button').length,
      hasPressedState: [...rail.querySelectorAll('button')].some((button) =>
        button.hasAttribute('aria-pressed'),
      ),
      hasHorizontalOverflow: rail.scrollWidth > rail.clientWidth + 1,
    }))
  expect(homeCategoryState).toEqual({
    buttonCount: 5,
    hasPressedState: false,
    hasHorizontalOverflow: false,
  })

  const featuredCard = page.getByTestId('food-delivery-menu-food_menu_verdant_aegean_garden')
  const featuredImageBox = await featuredCard
    .getByTestId('food-delivery-menu-open-food_menu_verdant_aegean_garden')
    .boundingBox()
  const featuredTitleBox = await featuredCard.locator('h3').boundingBox()
  expect(featuredImageBox).not.toBeNull()
  expect(featuredTitleBox).not.toBeNull()
  expect(featuredImageBox.y + featuredImageBox.height).toBeLessThanOrEqual(featuredTitleBox.y)

  const addressButton = page.getByTestId('food-delivery-light-address')
  await expect(addressButton).toHaveAttribute('aria-expanded', 'false')
  await addressButton.click()
  await expect(addressButton).toHaveAttribute('aria-expanded', 'true')
  await expect(page.getByTestId('food-delivery-light-address-panel')).toBeVisible()

  await testInfo.attach(`verdant-day-home-${testInfo.project.name}`, {
    body: await page.screenshot(),
    contentType: 'image/png',
  })
  await expectNoHorizontalOverflow(page)

  const campaignImage = page.locator(
    '[data-required-asset="verdant-day/promotions/verdant-day-promo-lunch-moment-01.png"]',
  )
  await expect(campaignImage).toBeVisible()
  await expect
    .poll(() => campaignImage.evaluate((image) => image.complete && image.naturalWidth > 0))
    .toBe(true)
  await page.getByTestId('food-delivery-light-campaign-open').click()
  const promotionDialog = page.getByTestId('food-delivery-light-promotion-dialog')
  await expect(promotionDialog).toBeVisible()
  await expect(promotionDialog).toContainText('A brighter lunch break.')
  const promotionImage = promotionDialog.locator(
    '[data-required-asset="verdant-day/promotions/verdant-day-promo-meal-spread-01.png"]',
  )
  await expect
    .poll(() => promotionImage.evaluate((image) => image.complete && image.naturalWidth > 0))
    .toBe(true)
  await testInfo.attach(`verdant-day-promotion-${testInfo.project.name}`, {
    body: await page.screenshot(),
    contentType: 'image/png',
  })
  await page.getByTestId('food-delivery-light-promotion-menu').click()
  await expect(page).toHaveURL(/shopView=menu/)
  await expect(page.getByTestId('food-delivery-light-menu-page')).toBeVisible()
  await testInfo.attach(`verdant-day-menu-${testInfo.project.name}`, {
    body: await page.screenshot(),
    contentType: 'image/png',
  })
  await expect(page.getByTestId('food-delivery-store-menu-section-all')).toHaveCount(0)
  await expect(page.getByTestId('food-delivery-store-menu-section-salads')).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await expect(page.locator('[data-menu-section="salads"]')).toHaveCount(3)

  const menuSearch = page.getByTestId('food-delivery-light-menu-search')
  await menuSearch.fill('Golden Grain')
  await expect(page.getByTestId('food-delivery-menu-group-warm_bowls')).toBeVisible()
  await expect(
    page.getByTestId('food-delivery-menu-open-food_menu_verdant_aegean_garden'),
  ).toHaveCount(0)
  await menuSearch.fill('')

  await page.getByTestId('food-delivery-menu-open-food_menu_verdant_aegean_garden').click()
  await expect(page).toHaveURL(/shopView=detail/)
  await expect(page).toHaveURL(/shopItemId=food_menu_verdant_aegean_garden/)
  await expect(page.getByTestId('food-delivery-light-detail-page')).toContainText(
    'Aegean Garden Salad',
  )
  await expect(page.getByTestId('food-delivery-menu-detail-sheet')).toHaveCount(0)
  await page.getByTestId('food-delivery-light-detail-quantity-increase').click()
  await expect(page.getByTestId('food-delivery-light-detail-quantity')).toContainText('2')
  await page.getByTestId('food-delivery-light-detail-add').click()

  await testInfo.attach(`verdant-day-detail-${testInfo.project.name}`, {
    body: await page.screenshot(),
    contentType: 'image/png',
  })

  const backButton = page.getByTestId('food-delivery-store-home')
  await expect(backButton).toHaveAttribute('aria-label', /^(Back|返回)$/)
  await backButton.click()
  await expect(page).toHaveURL(/shopView=menu/)
  await expect(page).not.toHaveURL(/shopItemId=/)
  await expect(page.getByTestId('food-delivery-light-menu-page')).toBeVisible()

  await backButton.click()
  await expect(page).not.toHaveURL(/shopView=/)
  await expect(page.getByTestId('food-delivery-light-home')).toBeVisible()
  await expect(backButton).toHaveAttribute('aria-label', /^(Return to Home|返回手机主页)$/)

  await page.getByTestId('food-delivery-light-header-bag').click()
  await expect(page).toHaveURL(/shopView=bag/)
  await expect(page.getByTestId('food-delivery-cart-panel')).toContainText('Aegean Garden Salad')
  await page.getByTestId('food-delivery-checkout').click()
  const checkoutSheet = page.getByTestId('food-delivery-checkout-sheet')
  await expect(checkoutSheet).toContainText('Verdant Day')
  await expect(checkoutSheet.locator('article').first()).toHaveCSS(
    'background-color',
    'rgb(242, 244, 239)',
  )
  await page.getByTestId('food-delivery-checkout-submit').click()

  await expect(page).toHaveURL(/shopView=order/)
  await expect(page).toHaveURL(/shopOrderId=/)
  await expect(page.getByTestId('food-delivery-light-order-page')).toContainText(
    'Aegean Garden Salad',
  )
  await expect(page.getByTestId('food-delivery-light-nav-orders')).toHaveAttribute(
    'aria-current',
    'page',
  )
  await testInfo.attach(`verdant-day-order-${testInfo.project.name}`, {
    body: await page.screenshot(),
    contentType: 'image/png',
  })
  await expectNoHorizontalOverflow(page)

  await backButton.click()
  await expect(page).toHaveURL(/shopView=orders/)
  await expect(page).not.toHaveURL(/shopOrderId=/)
  await expect(page.getByTestId('food-delivery-light-orders-page')).toBeVisible()

  await backButton.click()
  await expect(page).not.toHaveURL(/shopView=/)
  await expect(page.getByTestId('food-delivery-light-home')).toBeVisible()

  await backButton.click()
  await expectHomeReady(page)

  expect(pageErrors).toEqual([])
})
