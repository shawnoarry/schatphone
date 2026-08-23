import { expect, test } from '@playwright/test'
import { SHOPPING_SERVICE_PRESETS } from '../src/lib/planned-module-registry.js'
import { projectUiAssetUrl } from '../src/lib/project-assets.js'
import { navigateInsideUnlockedApp, unlockToHome } from './helpers/navigation.js'
import { installProjectAssetRoute, prewarmProjectAssets } from './helpers/project-assets.js'

const STOREFRONTS = Object.freeze(
  SHOPPING_SERVICE_PRESETS.map((preset) => ({
    service: preset.key,
    category: preset.categoryKeys?.[0] || 'mall',
    categories: preset.categoryKeys || ['mall'],
    name: preset.en,
    template: preset.storefrontTemplate,
    mapPlaceId: preset.mapReferencePlaceId,
  })),
)

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

const prepareShoppingProjectAssets = async (page) => {
  await prewarmProjectAssets(
    page.request,
    SHOPPING_SERVICE_PRESETS.map((preset) => projectUiAssetUrl(preset.brandAssetPath)).filter(Boolean),
  )
  await installProjectAssetRoute(page)
}

test('Shopping folder keeps rounded, separated brand previews', async ({ page }) => {
  const pageErrors = []
  page.on('pageerror', (error) => pageErrors.push(error.message))

  await unlockToHome(page)
  await prepareShoppingProjectAssets(page)
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

test('Shopping apps keep distinct routes, identities, carts, favorites, and orders', async ({
  page,
}, testInfo) => {
  test.slow()
  const pageErrors = []
  const consoleWarnings = []
  page.on('pageerror', (error) => pageErrors.push(error.message))
  page.on('console', (message) => {
    if (message.type() === 'warning') consoleWarnings.push(message.text())
  })

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
  await prepareShoppingProjectAssets(page)
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
    await expect(page.locator('.shopping-product-card[role="button"]')).toHaveCount(0)
    await expect(page.locator('.shopping-product-card button button')).toHaveCount(0)
    await expectNoPageOverflow(page)
    await settleStorefrontMotion(page)

    await testInfo.attach(
      `shopping-${storefront.service}-${testInfo.project.name}`,
      {
        body: await page.screenshot(),
        contentType: 'image/png',
      },
    )

  }

  await navigateInsideUnlockedApp(page, '/shopping/mellow_care?category=beauty')
  const search = page.getByRole('searchbox', { name: 'Search products' })
  await search.fill('Mood Tint')
  const moodTint = page.getByTestId('shopping-product-shopping_seed_care_lip')
  await expect(moodTint).toBeVisible()
  await expect(page.locator('#shopping-products .shopping-product-card')).toHaveCount(1)
  await moodTint.getByRole('button', { name: 'Toggle favorite' }).click()
  await page.getByRole('button', { name: 'Favorites' }).click()
  await expect(moodTint).toBeVisible()
  await moodTint.locator('.oy-media').click()
  await expect(page).toHaveURL(/productId=shopping_seed_care_lip/)
  await expect(page.getByTestId('shopping-store-specific-page')).toHaveAttribute(
    'data-page',
    'product',
  )
  await page.getByTestId('shopping-product-add').click()
  await expect(page.getByTestId('shopping-page-cart')).toContainText('1')

  await navigateInsideUnlockedApp(page, '/shopping/nordhus_home?category=home')
  await expect(page).toHaveURL(/\/shopping\/nordhus_home\?category=home$/)
  await expect(page.getByRole('button', { name: 'Cart', exact: true })).not.toContainText('1')
  await expect(page.getByTestId('shopping-product-shopping_seed_care_lip')).toHaveCount(0)
  await page.getByTestId('shopping-product-shopping_seed_nordhus_lamp').locator('.ikea-product-media').click()
  await expect(page).toHaveURL(/productId=shopping_seed_nordhus_lamp/)
  await expect(page.getByTestId('shopping-store-specific-page')).toHaveAttribute(
    'data-page',
    'product',
  )
  await page.getByTestId('shopping-product-add').click()
  const cartButton = page.getByTestId('shopping-page-cart')
  await expect(cartButton).toContainText('1')
  await cartButton.click()

  const cart = page.locator('#shopping-cart')
  await expect(cart).toContainText('Moonphase Bedside Lamp')
  await expect(cart).not.toContainText('Mood Tint Soft-Matte Lip Color')
  await cart.getByTestId('shopping-checkout').click()
  await expect(page).toHaveURL(/shopView=project-review/)
  await expect(page.getByTestId('shopping-checkout-review')).toBeVisible()
  await page.getByTestId('shopping-checkout-recipient').fill('Nova')
  await page.getByTestId('shopping-payment-submit').click()
  await expect(page).toHaveURL(/shopView=projects/)
  await expect(page.locator('article[data-testid^="shopping-order-"]')).toHaveCount(1)

  await navigateInsideUnlockedApp(page, '/shopping/mellow_care?category=beauty')
  await expect(page.getByRole('button', { name: 'Cart', exact: true })).toContainText('1')
  await expect(page.locator('article[data-testid^="shopping-order-"]')).toHaveCount(0)
  await page.getByRole('button', { name: 'Cart', exact: true }).click()
  await expect(page.locator('#shopping-cart')).toContainText('Mood Tint Soft-Matte Lip Color')
  await expect(page.locator('#shopping-cart')).not.toContainText('Moonphase Bedside Lamp')
  await page.getByTestId('shopping-checkout').click()
  await expect(page).toHaveURL(/shopView=routine-review/)
  await expect(page.getByTestId('shopping-checkout-review')).toBeVisible()
  await page.getByTestId('shopping-checkout-recipient').fill('Nova')
  await page.getByTestId('shopping-payment-submit').click()
  await expect(page).toHaveURL(/shopView=restocks/)
  await expect(page.locator('article[data-testid^="shopping-order-"]')).toHaveCount(1)

  await navigateInsideUnlockedApp(page, '/shopping/nordhus_home?category=home')
  await expect(page.getByRole('button', { name: 'Cart', exact: true })).not.toContainText('1')
  await page.getByRole('button', { name: /^Orders/ }).click()
  await expect(page).toHaveURL(/shopView=projects/)
  await expect(page.locator('article[data-testid^="shopping-order-"]')).toHaveCount(1)
  await expectNoPageOverflow(page)

  await testInfo.attach(`shopping-independent-app-state-${testInfo.project.name}`, {
    body: await page.screenshot(),
    contentType: 'image/png',
  })
  expect(pageErrors).toEqual([])
  expect(consoleWarnings.filter((message) => message.includes('Extraneous non-emits event listeners'))).toEqual([])
})

test('Coupang keeps detail, review checkout, and order creation as separate states', async ({ page }) => {
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
  await prepareShoppingProjectAssets(page)
  await navigateInsideUnlockedApp(page, '/shopping/schat_mall?category=mall')

  const product = page.getByTestId('shopping-product-shopping_seed_mall_card')
  await product.locator('.coupang-product-open').click()
  await expect(page.getByTestId('shopping-store-specific-page')).toHaveAttribute('data-page', 'product')
  await expect(page.getByTestId('shopping-product-add')).toBeVisible()
  await page.getByRole('button', { name: 'Reviews', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'No buyer reviews yet' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Product overview' })).toHaveCount(0)
  await page.getByRole('button', { name: 'Details', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Product overview' })).toBeVisible()
  await page.locator('.cp-pdp-buy .cp-qty button').nth(1).click()
  await page.getByTestId('shopping-product-add').click()

  const cartButton = page.getByTestId('shopping-page-cart')
  await expect(cartButton).toContainText('2')
  await cartButton.click()
  await page.getByTestId('shopping-checkout').click()
  await expect(page).toHaveURL(/shopView=checkout/)
  await expect(page.getByTestId('shopping-checkout-review')).toBeVisible()
  await expect(page.getByTestId('shopping-checkout-review')).toContainText('CNY')
  await expect(page.locator('article[data-testid^="shopping-order-"]')).toHaveCount(0)

  await page.getByTestId('shopping-checkout-recipient').fill('Nova')
  await page.getByTestId('shopping-payment-submit').click()
  await expect(page).toHaveURL(/shopView=orders/)
  await expect(page.getByTestId('shopping-checkout-review')).toHaveCount(0)
  await expect(page.locator('article[data-testid^="shopping-order-"]')).toHaveCount(1)
  await page.getByRole('button', { name: 'Delete', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Confirm delete', exact: true })).toBeVisible()
  await expect(page.locator('article[data-testid^="shopping-order-"]')).toHaveCount(1)
  await page.getByRole('button', { name: 'Cancel', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Confirm delete', exact: true })).toHaveCount(0)
  await expectNoPageOverflow(page)
  expect(pageErrors).toEqual([])
})

test('Six canonical storefronts expose their own interaction grammar', async ({ page }) => {
  const pageErrors = []
  page.on('pageerror', (error) => pageErrors.push(error.message))

  await page.addInitScript(() => {
    window.localStorage.setItem(
      'schatphone:store:system',
      JSON.stringify({
        version: 1,
        savedAt: Date.now(),
        data: { settings: { system: { language: 'en-US' } } },
      }),
    )
  })

  await unlockToHome(page)
  await prepareShoppingProjectAssets(page)
  const routeFor = (template) => STOREFRONTS.find((storefront) => storefront.template === template)

  const editorial = routeFor('tech_catalog')
  await navigateInsideUnlockedApp(page, `/shopping/${editorial.service}?category=${editorial.category}`)
  await page.getByRole('button', { name: /逛商品|SHOP/ }).click()
  await expect(page).toHaveURL(/shopView=objects/)
  await expect(page.locator('.cm-pages[data-page="category"]')).toBeVisible()
  await page.getByRole('button', { name: /返回上一页|Back/ }).click()
  await page.getByRole('searchbox', { name: /搜索商品|Search products/ }).fill('Orbit')
  await page.getByRole('button', { name: /提交搜索|Submit search/ }).click()
  await expect(page).toHaveURL(/q=Orbit/)
  await expect(page.locator('.cm-collection-item')).toHaveCount(1)
  await page.getByRole('button', { name: /返回上一页|Back/ }).click()
  await page.getByTestId('shopping-29cm-issue-toggle').click()
  await expect(page.locator('.cm-issue-index')).toBeVisible()
  const issueUrl = page.url()
  await page.getByRole('button', { name: /全部商品|All products/ }).click()
  await expect(page).toHaveURL(issueUrl)
  await page.getByTestId('shopping-product-shopping_seed_nova_bedside_radio').getByRole('button').first().click()
  await expect(page.locator('.cm-pages[data-page="product"]')).toBeVisible()
  await page.getByRole('tab', { name: /评价|Reviews/ }).click()
  await expect(page.getByTestId('shopping-29cm-owner-notes')).toHaveCount(1)
  await expect(page.locator('.cm-review-card')).toHaveCount(2)
  await expect(page.locator('.cm-pdp-media img')).toHaveAttribute('src', /cm29-bedside-radio-main\.webp$/)

  const fresh = routeFor('fresh_market')
  await navigateInsideUnlockedApp(page, `/shopping/${fresh.service}?category=${fresh.category}`)
  await page.getByTestId('shopping-kurly-lane-frozen').click()
  await expect(page.locator('.shopping-kurly-app')).toHaveAttribute('data-delivery-lane', 'frozen')
  await expect(page.locator('.kurly-delivery-note')).toContainText('FROZEN')

  const fashion = routeFor('fashion_editorial')
  await navigateInsideUnlockedApp(page, `/shopping/${fashion.service}?category=${fashion.category}`)
  await page.getByTestId('shopping-worksout-mode-lookbook').click()
  await expect(page.locator('.shopping-worksout-app')).toHaveAttribute('data-display-mode', 'lookbook')
  await expect(page.locator('#shopping-products')).toHaveClass(/is-lookbook/)

  const home = routeFor('room_planner')
  await navigateInsideUnlockedApp(page, `/shopping/${home.service}?category=${home.category}`)
  await page.getByTestId('shopping-ikea-tone-night').click()
  await expect(page.locator('.shopping-ikea-app')).toHaveAttribute('data-room-tone', 'night')
  await expect(page.locator('.ikea-room-stage')).toHaveClass(/is-night/)

  const care = routeFor('care_lab')
  await navigateInsideUnlockedApp(page, `/shopping/${care.service}?category=${care.category}`)
  await page.getByTestId('shopping-olive-routine-pm').click()
  await expect(page.locator('.shopping-olive-young-app')).toHaveAttribute('data-routine', 'pm')
  await page.locator('.olive-routine-add').first().click()
  await expect(page.locator('.olive-routine-item')).toHaveCount(1)
  await expectNoPageOverflow(page)
  expect(pageErrors).toEqual([])
})

test('Five extended storefronts keep real browse controls and static editorial content', async ({ page }) => {
  const pageErrors = []
  page.on('pageerror', (error) => pageErrors.push(error.message))

  await page.addInitScript(() => {
    window.localStorage.setItem(
      'schatphone:store:system',
      JSON.stringify({
        version: 1,
        savedAt: Date.now(),
        data: { settings: { system: { language: 'en-US' } } },
      }),
    )
  })

  await unlockToHome(page)
  await prepareShoppingProjectAssets(page)
  const routeFor = (template) => STOREFRONTS.find((storefront) => storefront.template === template)

  const traders = routeFor('member_warehouse')
  await navigateInsideUnlockedApp(page, `/shopping/${traders.service}?category=${traders.category}`)
  await expect(page.locator('.shopping-traders-app')).toHaveAttribute('data-warehouse-mode', 'pallet')
  await page.getByTestId('shopping-traders-mode-list').click()
  await expect(page.locator('.shopping-traders-app')).toHaveAttribute('data-warehouse-mode', 'list')
  await expect(page.locator('#shopping-products')).toHaveClass(/is-list/)
  await expect(page.locator('.traders-campaign-card')).toHaveCount(3)
  await expect(page.getByTestId('shopping-traders-pack-split')).toHaveCount(0)

  const cu = routeFor('neighborhood_convenience')
  await navigateInsideUnlockedApp(page, `/shopping/${cu.service}?category=${cu.category}`)
  await expect(page.locator('.cu-moment-card')).toHaveCount(3)
  await expect(page.getByTestId('shopping-cu-mode-pickup')).toHaveCount(0)
  await page.getByTestId('shopping-cu-pickup-orders').click()
  await expect(page).toHaveURL(/shopView=pickups/)
  await expect(page.locator('.cu-ops[data-page="orders"]')).toBeVisible()

  const musinsa = routeFor('fashion_catalog')
  await navigateInsideUnlockedApp(page, `/shopping/${musinsa.service}?category=${musinsa.category}`)
  await page.getByTestId('shopping-musinsa-view-catalog').click()
  await expect(page.locator('.shopping-musinsa-app')).toHaveAttribute('data-fashion-view', 'catalog')
  await expect(page.getByTestId('shopping-musinsa-campaign-after-dark')).toHaveJSProperty('tagName', 'ARTICLE')
  await expect(page.getByTestId('shopping-musinsa-lookbook-01')).toHaveJSProperty('tagName', 'ARTICLE')
  await page.locator('.musinsa-product-open').first().click()
  await expect(page.locator('.mu-pages[data-page="product"]')).toBeVisible()

  const boon = routeFor('buyer_atelier')
  await navigateInsideUnlockedApp(page, `/shopping/${boon.service}?category=${boon.category}`)
  await page.getByTestId('shopping-boon-mode-lookbook').click()
  await expect(page.locator('.shopping-boon-app')).toHaveAttribute('data-atelier-mode', 'lookbook')
  await expect(page.getByTestId('shopping-boon-story-quiet-tailoring')).toHaveJSProperty('tagName', 'ARTICLE')
  await expect(page.getByTestId('shopping-boon-material-wool')).toHaveJSProperty('tagName', 'ARTICLE')
  await page.locator('.boon-visual').first().click()
  await expect(page.locator('.boon-pages[data-page="product"]')).toBeVisible()

  const galleria = routeFor('luxury_hall')
  await navigateInsideUnlockedApp(page, `/shopping/${galleria.service}?category=${galleria.category}`)
  await page.getByTestId('shopping-galleria-mode-selection').click()
  await expect(page.locator('.shopping-galleria-app')).toHaveAttribute('data-hall-mode', 'selection')
  await expect(page.getByTestId('shopping-galleria-campaign-heirloom')).toHaveJSProperty('tagName', 'ARTICLE')
  await expect(page.getByTestId('shopping-galleria-hall-atelier')).toHaveJSProperty('tagName', 'ARTICLE')
  await page.locator('.galleria-product-open').first().click()
  await expect(page.locator('.gal-pages[data-page="product"]')).toBeVisible()

  await expectNoPageOverflow(page)
  expect(pageErrors).toEqual([])
})
