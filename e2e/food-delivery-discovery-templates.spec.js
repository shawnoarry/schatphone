import { expect, test } from '@playwright/test'
import { navigateInsideUnlockedApp, unlockToHome } from './helpers/navigation.js'

const templateCases = [
  {
    restaurantId: 'food_seed_river_noodles',
    category: 'fast_food',
    templateId: 'street_food_stall',
    firstSection: 'broth_noodles',
    nextSection: 'dry_noodles',
    assetSlug: 'river-noodles',
    identityAlt: 'River Noodles bowl',
  },
  {
    restaurantId: 'food_seed_sugar_lane',
    category: 'dessert',
    templateId: 'convenience_shelf',
    firstSection: 'layer_cakes',
    nextSection: 'pastry_case',
    assetSlug: 'sugar-lane',
    identityAlt: 'Sugar Lane dessert',
  },
]

const expectNoHorizontalOverflow = async (page) => {
  const overflow = await page.evaluate(() => ({
    document: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    body: document.body.scrollWidth - document.body.clientWidth,
  }))

  expect(overflow.document).toBeLessThanOrEqual(1)
  expect(overflow.body).toBeLessThanOrEqual(1)
}

test('reusable discovery templates stay distinct and menu mosaic can be reassigned', async ({
  page,
}, testInfo) => {
  const pageErrors = []
  const consoleErrors = []
  page.on('pageerror', (error) => pageErrors.push(error.message))
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text())
  })

  await unlockToHome(page)

  for (const templateCase of templateCases) {
    await navigateInsideUnlockedApp(
      page,
      `/food-delivery?category=${templateCase.category}&restaurantId=${templateCase.restaurantId}&entry=shop`,
    )

    const storeShell = page.getByTestId('food-delivery-store-shell')
    await expect(storeShell).toHaveAttribute('data-store-template', templateCase.templateId)
    const identityImage = storeShell.locator(`img[alt="${templateCase.identityAlt}"]`).first()
    await expect(identityImage).toHaveAttribute(
      'src',
      new RegExp(`${templateCase.assetSlug}/cover/${templateCase.assetSlug}-cover-01\\.png$`),
    )
    await expect
      .poll(() =>
        identityImage.evaluate((image) => ({
          complete: image.complete,
          width: image.naturalWidth,
          height: image.naturalHeight,
        })),
      )
      .toEqual({ complete: true, width: 1200, height: 750 })
    await expect(page.getByTestId('food-delivery-store-menu-section-all')).toHaveCount(0)
    await expect(page.getByTestId(`food-delivery-store-menu-section-${templateCase.firstSection}`)).toBeVisible()
    await expect(page.getByTestId('food-delivery-store-menu-items')).toHaveAttribute(
      'data-active-section',
      templateCase.firstSection,
    )
    await expect(page.locator('[data-testid^="food-delivery-menu-open-"]')).not.toHaveCount(0)

    await page.getByTestId(`food-delivery-store-menu-section-${templateCase.nextSection}`).click()
    await expect(page.getByTestId('food-delivery-store-menu-items')).toHaveAttribute(
      'data-active-section',
      templateCase.nextSection,
    )
    await expect(page.locator('[data-testid^="food-delivery-menu-open-"]')).not.toHaveCount(0)

    const productViews = page.locator('[data-testid^="food-delivery-menu-open-"]')
    await expect
      .poll(() =>
        productViews.evaluateAll(
          (views, assetSlug) =>
            views.every((view) => {
              const image = view.querySelector('img')
              return Boolean(
                image &&
                  !image.hidden &&
                  image.complete &&
                  image.naturalWidth === 768 &&
                  image.naturalHeight === 768 &&
                  image.currentSrc.includes(
                    `/images/ui-assets/apps/food-delivery/${assetSlug}/products/`,
                  ),
              )
            }),
          templateCase.assetSlug,
        ),
      )
      .toBe(true)
    await expect(
      page.locator(
        '[data-testid^="food-delivery-menu-open-"].is-image-fallback, [data-testid^="food-delivery-menu-open-"] .is-image-fallback',
      ),
    ).toHaveCount(0)
    await expectNoHorizontalOverflow(page)

    await testInfo.attach(`${templateCase.templateId}-${testInfo.project.name}`, {
      body: await page.screenshot(),
      contentType: 'image/png',
    })

    await productViews.first().click()
    const detailSheet = page.getByTestId('food-delivery-menu-detail-sheet')
    await expect(detailSheet).toBeVisible()
    const detailImage = detailSheet.locator('img')
    await expect(detailImage).toHaveAttribute(
      'src',
      new RegExp(`${templateCase.assetSlug}/products/${templateCase.assetSlug}-item-\\d{2}\\.png$`),
    )
    await expect
      .poll(() =>
        detailImage.evaluate((image) => ({
          complete: image.complete,
          width: image.naturalWidth,
          height: image.naturalHeight,
        })),
      )
      .toEqual({ complete: true, width: 768, height: 768 })
    await expectNoHorizontalOverflow(page)
    await testInfo.attach(`${templateCase.assetSlug}-detail-${testInfo.project.name}`, {
      body: await page.screenshot(),
      contentType: 'image/png',
    })
    await page.getByTestId('food-delivery-menu-detail-close').click()
  }

  await navigateInsideUnlockedApp(page, '/app-store?section=shops')
  await page.getByTestId('app-store-item-shop_app_food_seed_moon_bistro').click()
  await page.locator(
    '[data-testid="app-store-open-identity"]:visible, [data-testid="app-store-open-identity-sheet"]:visible',
  ).click()
  await page.getByTestId('app-store-identity-shop-template').selectOption('menu_mosaic')
  await page.getByTestId('app-store-identity-save').click()

  await navigateInsideUnlockedApp(
    page,
    '/food-delivery?category=restaurants&restaurantId=food_seed_moon_bistro&entry=shop',
  )
  const mosaicShell = page.getByTestId('food-delivery-store-shell')
  await expect(mosaicShell).toHaveAttribute('data-store-template', 'menu_mosaic')
  await expect(mosaicShell).toContainText('Moon Bistro')
  await expect(mosaicShell).not.toContainText('Daylight Cafe')
  await expect(mosaicShell).not.toContainText('Harbor Roast')
  await expect(page.getByTestId('food-delivery-store-menu-section-all')).toHaveCount(0)
  await expect(page.getByTestId('food-delivery-store-menu-items')).not.toHaveAttribute(
    'data-active-section',
    'all',
  )
  await expectNoHorizontalOverflow(page)

  await testInfo.attach(`menu-mosaic-${testInfo.project.name}`, {
    body: await page.screenshot(),
    contentType: 'image/png',
  })

  expect(pageErrors).toEqual([])
  expect(consoleErrors).toEqual([])
})
