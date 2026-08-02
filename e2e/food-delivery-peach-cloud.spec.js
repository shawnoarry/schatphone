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
  await page.locator('.home-dot').nth(1).click()
  await page.getByTestId('home-folder-app_food_delivery').click()
  const folderBrandMark = page.getByTestId(
    'home-folder-entry-image-shop_app_food_seed_peach_cloud',
  )
  await expect(folderBrandMark).toBeVisible()
  await expect(folderBrandMark).toHaveAttribute(
    'src',
    /peach-cloud\/brand\/peach-cloud-mark-01\.svg/,
  )
  await expect.poll(() => folderBrandMark.evaluate((image) => image.naturalWidth)).toBeGreaterThan(0)
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
  await expect(page.getByTestId('food-delivery-peach-cloud-campaigns').getByRole('button')).toHaveCount(3)
  const [homeHeaderBox, homeMainBox, posterStageBox, categoryRailBox] = await Promise.all([
    page.getByTestId('food-delivery-peach-cloud-home-header').boundingBox(),
    page.getByTestId('food-delivery-peach-cloud-home-main').boundingBox(),
    page.getByTestId('food-delivery-peach-cloud-home-poster-stage').boundingBox(),
    page.getByTestId('food-delivery-store-menu-section-rail').boundingBox(),
  ])
  expect(homeHeaderBox).not.toBeNull()
  expect(homeMainBox).not.toBeNull()
  expect(posterStageBox).not.toBeNull()
  expect(categoryRailBox).not.toBeNull()
  expect(homeMainBox.y).toBeGreaterThanOrEqual(homeHeaderBox.y + homeHeaderBox.height - 1)
  expect(posterStageBox.y).toBeGreaterThanOrEqual(homeMainBox.y)
  expect(categoryRailBox.y).toBeGreaterThan(posterStageBox.y + posterStageBox.height)
  const categoryShortcutBoxes = await page
    .getByTestId('food-delivery-store-menu-section-rail')
    .getByRole('button')
    .evaluateAll((buttons) =>
      buttons.map((button) => {
        const box = button.getBoundingClientRect()
        return { height: box.height, width: box.width, y: box.y }
      }),
    )
  expect(categoryShortcutBoxes).toHaveLength(5)
  expect(new Set(categoryShortcutBoxes.map((box) => Math.round(box.y))).size).toBe(1)
  expect(categoryRailBox.height).toBeLessThanOrEqual(112)
  const homePosterImages = page
    .getByTestId('food-delivery-peach-cloud-campaigns')
    .locator('img[data-required-asset^="peach-cloud/promotions/posters/"]')
  await expect(homePosterImages).toHaveCount(3)
  expect(
    await homePosterImages.evaluateAll((images) =>
      images.every(
        (image) =>
          image.complete && image.naturalWidth === 1024 && image.naturalHeight === 1536,
      ),
    ),
  ).toBe(true)
  const homePosterSources = await homePosterImages.evaluateAll((images) =>
    images.map((image) => image.getAttribute('src')),
  )
  const homePosterCarouselWidth = await page
    .getByTestId('food-delivery-peach-cloud-campaigns')
    .evaluate((carousel) => carousel.clientWidth)
  const homePosterBoxes = await page
    .getByTestId('food-delivery-peach-cloud-campaigns')
    .getByRole('button')
    .evaluateAll((buttons) =>
      buttons.map((button) => {
        const box = button.getBoundingClientRect()
        return { height: box.height, width: box.width }
      }),
  )
  expect(homePosterBoxes).toHaveLength(3)
  expect(homePosterBoxes.every((box) => box.height > box.width * 1.45)).toBe(true)
  expect(
    homePosterBoxes.every((box) => Math.abs(box.width - homePosterCarouselWidth) <= 1),
  ).toBe(true)
  const productImages = page.locator(
    'img[data-required-asset^="peach-cloud/products/peach-cloud-item-"]',
  )
  await expect(productImages).toHaveCount(0)
  await testInfo.attach('peach-cloud-palette-home', {
    body: await page.screenshot(),
    contentType: 'image/png',
  })
  await expect(storeShell).toContainText('Peach Cloud')
  await expect(page.getByTestId('food-delivery-peach-cloud-brand-hero')).toHaveCount(0)
  await expect(page.getByTestId('food-delivery-peach-cloud-hero-cover')).toHaveCount(0)
  await expect(page.getByTestId('food-delivery-peach-cloud-featured')).toHaveCount(0)
  await expect(page.locator('[data-testid^="food-delivery-menu-"][data-menu-section]')).toHaveCount(
    0,
  )
  await expectNoHorizontalOverflow(page)

  await page.getByTestId('food-delivery-peach-cloud-poster-white-peach-lime').click()
  await expect(page.getByTestId('food-delivery-menu-detail-sheet')).toContainText('白桃青柠气泡')
  await page.getByTestId('food-delivery-menu-detail-close').click()

  await page.getByTestId('food-delivery-peach-cloud-nav-cart').click()
  await expect(page).toHaveURL(/shopView=bag/)
  await expect(page.getByTestId('food-delivery-peach-cloud-bag-page')).toContainText(
    /购物袋轻飘飘的|Your bag feels light/,
  )
  await expect(page.getByTestId('food-delivery-peach-cloud-featured')).toHaveCount(0)

  await page.getByTestId('food-delivery-peach-cloud-nav-menu').click()
  await expect(page).toHaveURL(/shopView=search/)
  await expect(page.getByTestId('food-delivery-peach-cloud-search-page')).toBeVisible()
  const searchCategories = page.getByTestId('food-delivery-peach-cloud-search-categories')
  await expect(searchCategories).not.toContainText('全部')
  await expect(searchCategories).toContainText('鲜果')
  await expect(
    page.getByTestId('food-delivery-peach-cloud-search-category-fruit_sparkle'),
  ).toHaveAccessibleName('鲜果特饮')
  const searchCategoryButtons = searchCategories.getByRole('button')
  await expect(searchCategoryButtons).toHaveCount(5)
  const searchCategoryBoxes = await searchCategoryButtons.evaluateAll((buttons) =>
    buttons.map((button) => {
      const box = button.getBoundingClientRect()
      return { width: box.width, y: box.y }
    }),
  )
  expect(new Set(searchCategoryBoxes.map((box) => Math.round(box.y))).size).toBe(1)
  expect(
    await searchCategories.evaluate((container) => container.scrollWidth <= container.clientWidth),
  ).toBe(true)
  const categoryImages = searchCategories.locator('img[data-required-asset]')
  await expect(categoryImages).toHaveCount(5)
  expect(
    await categoryImages.evaluateAll((images) =>
      images.every(
        (image) =>
          image.getAttribute('data-required-asset')?.startsWith('peach-cloud/categories/peach-cloud-') &&
          image.complete &&
          image.naturalWidth > 0,
      ),
    ),
  ).toBe(true)
  await expectNoHorizontalOverflow(page)
  await expect(page.getByTestId('food-delivery-peach-cloud-brand-hero')).toHaveCount(0)
  await expect(page.getByTestId('food-delivery-peach-cloud-new-page')).toHaveCount(0)
  await page.getByTestId('food-delivery-peach-cloud-nav-discover').click()
  await expect(page).toHaveURL(/shopView=new/)
  await expect(page.getByTestId('food-delivery-peach-cloud-new-page')).toBeVisible()
  await expect(page.getByTestId('food-delivery-peach-cloud-new-page')).toContainText('新品放映厅')
  await expect(page.getByTestId('food-delivery-peach-cloud-new-page')).not.toContainText(
    '按分享人数选规格',
  )
  await expect(page.getByTestId('food-delivery-menu-food_menu_peach_golden_hour_set')).toHaveCount(
    0,
  )
  await expect(
    page
      .getByTestId('food-delivery-peach-cloud-new-page')
      .locator('[data-testid^="food-delivery-menu-"][data-menu-section]'),
  ).toHaveCount(0)
  await expect(page.locator('[data-testid^="food-delivery-peach-cloud-new-poster-"]')).toHaveCount(3)
  const promotionImage = page.getByTestId('food-delivery-peach-cloud-promotion-image')
  await expect(promotionImage).toHaveAttribute(
    'data-required-asset',
    'peach-cloud/promotions/peach-cloud-golden-pairing-01.png',
  )
  await expect
    .poll(() => promotionImage.evaluate((image) => image.complete && image.naturalWidth > 0))
    .toBe(true)
  await expect(promotionImage).toHaveCSS('object-fit', 'contain')
  expect(homePosterSources).not.toContain(await promotionImage.getAttribute('src'))
  await expect(page.getByTestId('food-delivery-peach-cloud-featured')).toContainText(
    '金桃芝士蛋糕双享',
  )
  await expect(page.getByTestId('food-delivery-peach-cloud-featured')).toContainText('48.00 CNY')
  const pairingCardBox = await page
    .getByTestId('food-delivery-peach-cloud-featured')
    .boundingBox()
  expect(pairingCardBox).not.toBeNull()
  expect(pairingCardBox.width / pairingCardBox.height).toBeGreaterThan(1.7)
  expect(pairingCardBox.width / pairingCardBox.height).toBeLessThan(1.85)
  await page.getByTestId('food-delivery-peach-cloud-featured-action').click()
  await expect(page.getByTestId('food-delivery-menu-detail-sheet')).toContainText(
    '金桃芝士蛋糕双享',
  )
  await expect(page).toHaveURL(/shopView=new/)
  await page.getByTestId('food-delivery-menu-detail-close').click()
  await testInfo.attach('peach-cloud-poster-gallery', {
    body: await page.screenshot(),
    contentType: 'image/png',
  })
  await expect(page.getByTestId('food-delivery-peach-cloud-brand-hero')).toHaveCount(0)
  await expect(page.getByTestId('food-delivery-peach-cloud-search-page')).toHaveCount(0)
  await expect(page.getByTestId('food-delivery-peach-cloud-nav-discover')).toHaveCSS(
    'background-color',
    'rgb(253, 108, 147)',
  )
  await page.getByTestId('food-delivery-peach-cloud-nav-home').click()
  await expect(page).not.toHaveURL(/shopView=/)

  await page.getByTestId('food-delivery-peach-cloud-home-club').click()
  await expect(page).toHaveURL(/shopView=club/)
  await expect(page.getByTestId('food-delivery-peach-cloud-club-page')).toContainText(
    '桃子会本月礼遇',
  )
  await page.getByTestId('food-delivery-peach-cloud-club-merch-action').click()
  await expect(page).toHaveURL(/shopView=merch/)
  const merchandiseImages = page.locator(
    'img[data-required-asset^="peach-cloud/merchandise/peach-cloud-merch-"]',
  )
  await expect(merchandiseImages).toHaveCount(3)
  await expect
    .poll(() =>
      merchandiseImages.evaluateAll((images) =>
        images.every((image) => image.complete && image.naturalWidth > 0),
      ),
    )
    .toBe(true)
  await page
    .getByTestId('food-delivery-peach-cloud-add-merch-peach_merch_cloud_plush')
    .click()
  await page.getByTestId('food-delivery-peach-cloud-nav-home').click()
  await expect(page).not.toHaveURL(/shopView=/)

  await page.getByTestId('food-delivery-store-menu-section-fruit_sparkle').click()
  await expect(page.getByTestId('food-delivery-store-menu-items')).toHaveAttribute(
    'data-active-section',
    'fruit_sparkle',
  )
  await expect(page.locator('[data-testid^="food-delivery-menu-"][data-menu-section]')).toHaveCount(
    5,
  )

  await page.getByTestId('food-delivery-menu-open-food_menu_peach_oolong_cloud').click()
  await expect(page.getByTestId('food-delivery-menu-detail-sheet')).toContainText(
    '白桃青柠气泡',
  )
  await page.getByTestId('food-delivery-menu-detail-quantity-increase').click()
  await expect(page.getByTestId('food-delivery-menu-detail-quantity')).toContainText('2')
  await page.getByTestId('food-delivery-menu-detail-add').click()
  await page.getByTestId('food-delivery-menu-detail-close').click()

  await page.getByTestId('food-delivery-peach-cloud-nav-cart').click()
  await expect(page).toHaveURL(/shopView=bag/)
  await expect(page.getByTestId('food-delivery-cart-panel')).toContainText(
    '白桃青柠气泡',
  )
  await expect(page.getByTestId('food-delivery-cart-panel')).toContainText('桃气云朵毛绒')
  await expect(page.getByTestId('food-delivery-peach-cloud-nav')).toBeVisible()
  await page.getByTestId('food-delivery-checkout').click()
  await expect(page.getByTestId('food-delivery-checkout-sheet')).toContainText('Peach Cloud')
  await expect(page.getByTestId('food-delivery-checkout-sheet')).toContainText(
    '白桃青柠气泡',
  )
  await page.getByTestId('food-delivery-checkout-submit').click()

  await expect(page).toHaveURL(/shopView=order/)
  await expect(page).toHaveURL(/shopOrderId=/)
  await expect(page.getByTestId('food-delivery-peach-cloud-order-page')).toContainText(
    /本次点单|Your order/,
  )
  await page.getByTestId('food-delivery-peach-cloud-nav-orders').click()
  await expect(page).toHaveURL(/shopView=orders/)
  await expect(page.getByTestId('food-delivery-orders-panel')).toContainText(
    '白桃青柠气泡',
  )
  await expectNoHorizontalOverflow(page)

  expect(pageErrors).toEqual([])
})
