import { expect, test } from '@playwright/test'
import { navigateInsideUnlockedApp, unlockToHome } from './helpers/navigation.js'

const STOREFRONTS = Object.freeze([
  {
    service: 'schat_mall',
    category: 'mall',
    categories: ['mall', 'gifts', 'home', 'fashion', 'beauty'],
    name: 'Coupang',
    template: 'city_market',
    mapPlaceId: 'seoul-starfield-coex-mall',
  },
  {
    service: 'nova_digital',
    category: 'digital',
    categories: ['digital', 'luxury', 'gifts'],
    name: '29CM',
    template: 'tech_catalog',
    mapPlaceId: 'seoul-samsung-town',
  },
  {
    service: 'daily_fresh',
    category: 'grocery',
    categories: ['grocery', 'home', 'mall'],
    name: 'Kurly',
    template: 'fresh_market',
    mapPlaceId: 'seoul-lotte-mart-seoul-station',
  },
  {
    service: 'style_cloud',
    category: 'fashion',
    categories: ['fashion', 'luxury', 'gifts'],
    name: 'WORKSOUT',
    template: 'fashion_editorial',
    mapPlaceId: 'seoul-galleria-luxury-hall',
  },
  {
    service: 'nordhus_home',
    category: 'home',
    categories: ['home', 'gifts'],
    name: 'IKEA Korea',
    template: 'room_planner',
    mapPlaceId: 'seoul-the-hyundai-seoul',
  },
  {
    service: 'mellow_care',
    category: 'beauty',
    categories: ['beauty', 'gifts'],
    name: 'OLIVE YOUNG',
    template: 'care_lab',
    mapPlaceId: 'seoul-jennyhouse-cheongdam-hill',
  },
])

const expectNoPageOverflow = async (page) => {
  await expect
    .poll(() =>
      page.evaluate(() => {
        const documentFits =
          document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1
        const shell = document.querySelector('.shopping-view-shell')
        const shellFits = !shell || shell.scrollWidth <= shell.clientWidth + 1
        return documentFits && shellFits
      }),
    )
    .toBe(true)
}

const settleStorefrontMotion = async (page) => {
  await page.evaluate(async () => {
    const animations = document
      .getAnimations()
      .filter((animation) => animation.playState !== 'finished')
    await Promise.all(animations.map((animation) => animation.finished.catch(() => undefined)))
  })
}

test('Shopping folder keeps rounded, separated brand previews', async ({ page }) => {
  const pageErrors = []
  page.on('pageerror', (error) => pageErrors.push(error.message))

  await unlockToHome(page)
  await navigateInsideUnlockedApp(page, '/home?homePage=1')

  const folder = page.getByTestId('home-folder-app_shopping')
  await expect(folder).toBeVisible()

  const preview = folder.locator('.home-folder-preview-grid')
  const previewCells = preview.locator('.home-folder-preview-cell')
  await expect(previewCells).toHaveCount(4)
  await expect
    .poll(() =>
      preview.evaluate((element) => {
        const style = getComputedStyle(element)
        return {
          width: style.width,
          height: style.height,
          gap: style.gap,
        }
      }),
    )
    .toEqual({ width: '40px', height: '40px', gap: '4px' })

  for (const cell of await previewCells.all()) {
    await expect
      .poll(() =>
        cell.evaluate((element) => {
          const style = getComputedStyle(element)
          return `${style.borderRadius}:${style.overflow}`
        }),
      )
      .toBe('6px:hidden')
  }

  await folder.click()
  await expect(page.getByTestId('home-folder-overlay')).toBeVisible()
  const brandImages = page.locator('[data-testid^="home-folder-entry-image-shop_app_shopping_"]')
  await expect(brandImages).toHaveCount(6)
  await expect
    .poll(() =>
      brandImages.evaluateAll((images) =>
        images.every((image) => image.complete && image.naturalWidth === 256 && image.naturalHeight === 256),
      ),
    )
    .toBe(true)

  await page.locator('.home-folder-panel-head button').click()
  await expect(page.getByTestId('home-folder-overlay')).toHaveCount(0)
  expect(pageErrors).toEqual([])
})

test('six Shopping apps keep distinct routes, identities, carts, favorites, and orders', async ({
  page,
}, testInfo) => {
  test.slow()
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
  await navigateInsideUnlockedApp(page, '/shopping?service=schat_mall&category=mall')
  await expect(page).toHaveURL(/\/shopping\/schat_mall\?category=mall$/)
  await expect(page.getByTestId('shopping-service-filter-panel')).toHaveCount(0)

  for (const storefront of STOREFRONTS) {
    await navigateInsideUnlockedApp(
      page,
      `/shopping/${storefront.service}?category=${storefront.category}`,
    )
    await expect(page).toHaveURL(
      new RegExp(`/shopping/${storefront.service}\\?category=${storefront.category}$`),
    )
    const header = page.locator('.shopping-storefront-header')
    await expect(header).toHaveAttribute('data-storefront', storefront.template)
    await expect(header.locator('h1')).toHaveText(storefront.name)
    await expect(page.getByTestId('shopping-service-filter-panel')).toHaveCount(0)
    await expect(page.getByTestId('shopping-service-all')).toHaveCount(0)
    await expect(page.getByTestId('shopping-map-reference')).toHaveAttribute(
      'data-map-place-id',
      storefront.mapPlaceId,
    )
    await expect(page.getByTestId(`shopping-category-${storefront.category}`)).toHaveClass(
      /is-active/,
    )
    await expect
      .poll(() => page.locator('#shopping-products .shopping-product-card').count())
      .toBeGreaterThanOrEqual(3)
    await expectNoPageOverflow(page)
    await settleStorefrontMotion(page)

    await testInfo.attach(
      `shopping-${storefront.service}-${testInfo.project.name}`,
      {
        body: await page.screenshot(),
        contentType: 'image/png',
      },
    )

    for (const category of storefront.categories) {
      await page.getByTestId(`shopping-category-${category}`).click()
      await expect(page.getByTestId(`shopping-category-${category}`)).toHaveClass(/is-active/)
      await expect
        .poll(() => page.locator('#shopping-products .shopping-product-card').count())
        .toBeGreaterThan(0)
    }
    await page.getByTestId(`shopping-category-${storefront.category}`).click()
    await expect(page.getByTestId(`shopping-category-${storefront.category}`)).toHaveClass(
      /is-active/,
    )
  }

  const search = page.getByRole('searchbox', { name: 'Search products' })
  await search.fill('Mood Tint')
  const moodTint = page.getByTestId('shopping-product-shopping_seed_care_lip')
  await expect(moodTint).toBeVisible()
  await expect(page.locator('#shopping-products .shopping-product-card')).toHaveCount(1)
  await moodTint.getByRole('button', { name: 'Toggle favorite' }).click()
  await page.getByRole('button', { name: 'Favorites' }).click()
  await expect(moodTint).toBeVisible()
  await moodTint.getByTestId('shopping-add-cart-shopping_seed_care_lip').click()
  await expect(page.getByRole('button', { name: 'Cart', exact: true })).toContainText('1')

  await navigateInsideUnlockedApp(page, '/shopping/nordhus_home?category=home')
  await expect(page).toHaveURL(/\/shopping\/nordhus_home\?category=home$/)
  await expect(page.getByRole('button', { name: 'Cart', exact: true })).not.toContainText('1')
  await page.getByRole('button', { name: 'Favorites' }).click()
  await expect(page.getByTestId('shopping-product-shopping_seed_care_lip')).toHaveCount(0)
  await page.getByRole('button', { name: 'Show all products' }).click()
  await page.getByTestId('shopping-add-cart-shopping_seed_nordhus_lamp').click()
  const cartButton = page.getByRole('button', { name: 'Cart', exact: true })
  await expect(cartButton).toContainText('1')
  await cartButton.click()

  const cart = page.locator('#shopping-cart')
  await expect(cart).toContainText('Moonphase Bedside Lamp')
  await expect(cart).not.toContainText('Mood Tint Soft-Matte Lip Color')
  await cart.getByTestId('shopping-checkout').click()
  await expect(page.locator('article[data-testid^="shopping-order-"]').first()).toContainText(
    '1 items',
  )

  await navigateInsideUnlockedApp(page, '/shopping/mellow_care?category=beauty')
  await expect(page.getByRole('button', { name: 'Cart', exact: true })).toContainText('1')
  await expect(page.locator('article[data-testid^="shopping-order-"]')).toHaveCount(0)
  await page.getByRole('button', { name: 'Cart', exact: true }).click()
  await expect(page.locator('#shopping-cart')).toContainText('Mood Tint Soft-Matte Lip Color')
  await expect(page.locator('#shopping-cart')).not.toContainText('Moonphase Bedside Lamp')
  await page.getByTestId('shopping-checkout').click()
  await expect(page.locator('article[data-testid^="shopping-order-"]').first()).toContainText(
    '1 items',
  )

  await navigateInsideUnlockedApp(page, '/shopping/nordhus_home?category=home')
  await expect(page.getByRole('button', { name: 'Cart', exact: true })).not.toContainText('1')
  await expect(page.locator('article[data-testid^="shopping-order-"]')).toHaveCount(1)
  await expectNoPageOverflow(page)

  await testInfo.attach(`shopping-independent-app-state-${testInfo.project.name}`, {
    body: await page.screenshot(),
    contentType: 'image/png',
  })
  expect(pageErrors).toEqual([])
})
