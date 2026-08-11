import { expect, test } from '@playwright/test'
import { projectUiAssetUrl } from '../src/lib/project-assets.js'
import { navigateInsideUnlockedApp, unlockToHome } from './helpers/navigation.js'

const expectNoHorizontalOverflow = async (page) => {
  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  )
  expect(hasHorizontalOverflow).toBe(false)
}

test('Food Platform controls and checkout produce a complete in-app order flow', async ({
  page,
}, testInfo) => {
  test.setTimeout(90_000)
  const pageErrors = []
  page.on('pageerror', (error) => {
    pageErrors.push(error.message)
  })

  await unlockToHome(page)
  await navigateInsideUnlockedApp(page, '/food-delivery?category=nearby')
  await expectNoHorizontalOverflow(page)

  const platformOrderAssetPaths = [
    'platform/orders/platform-checkout-takeout-bag-01.png',
    'platform/orders/platform-order-status-placed-01.png',
    'platform/orders/platform-order-status-preparing-01.png',
    'platform/orders/platform-order-status-delivering-01.png',
    'platform/orders/platform-order-status-delivered-01.png',
    'platform/orders/platform-order-status-cancelled-01.png',
    'platform/orders/platform-orders-empty-receipt-01.png',
  ]
  const platformOrderAssetResults = []
  for (const assetPath of platformOrderAssetPaths) {
    const response = await page.request.get(
      projectUiAssetUrl(`apps/food-delivery/${assetPath}`),
    )
    platformOrderAssetResults.push({
      assetPath,
      loaded: response.ok() && response.headers()['content-type']?.startsWith('image/png'),
    })
  }
  expect(platformOrderAssetResults).toEqual(
    platformOrderAssetPaths.map((assetPath) => ({ assetPath, loaded: true })),
  )
  const foodViewBox = await page.getByTestId('food-delivery-view').boundingBox()
  const platformBox = await page.getByTestId('food-delivery-platform').boundingBox()
  expect(foodViewBox).not.toBeNull()
  expect(platformBox).not.toBeNull()
  expect(platformBox.x).toBeGreaterThanOrEqual(foodViewBox.x - 1)
  expect(platformBox.x + platformBox.width).toBeLessThanOrEqual(
    foodViewBox.x + foodViewBox.width + 1,
  )
  await expect(page.getByTestId('food-delivery-category-grid').locator('button')).toHaveCount(10)
  await expect(page.getByTestId('food-delivery-category-icon-all')).toBeVisible()
  await expect(page.getByTestId('food-delivery-category-icon-sushi')).toHaveAttribute(
    'data-required-asset',
    'platform/categories/icons/category-sushi-01.png',
  )
  await page.getByTestId('food-delivery-category-sushi').click()
  await expect(page).toHaveURL(/category=restaurants/)
  await expect(page).toHaveURL(/platformFilter=sushi/)
  await expect(page.getByTestId('food-delivery-shop-app-list')).toContainText('寿司花')
  await expect(
    page.getByTestId('food-delivery-platform-merchant-platform_hanwoo_gukbap'),
  ).toHaveCount(0)
  await page.getByTestId('food-delivery-category-all').click()
  await expect(page).toHaveURL(/platformFilter=all/)
  await expect(
    page.locator('[data-testid="food-delivery-shop-app-list"] [data-platform-category]'),
  ).toHaveCount(3)
  await expect(page.getByTestId('food-delivery-platform-merchant-summary')).toContainText(
    '随机推荐 3 家 · 共 11 家',
  )

  const bannerRail = page.getByTestId('food-delivery-platform-banner-rail')
  const bannerScroller = page.getByTestId('food-delivery-platform-banner-scroller')
  await page.getByTestId('food-delivery-platform-banner-dot-1').click()
  await expect(bannerRail).toHaveAttribute('data-active-banner-index', '1')
  await expect(page.getByTestId('food-delivery-platform-banner-dot-1')).toHaveAttribute(
    'aria-current',
    'true',
  )
  await expect
    .poll(() => bannerScroller.evaluate((element) => element.scrollLeft))
    .toBeGreaterThan(250)
  await page.getByTestId('food-delivery-platform-banner-dot-2').click()
  await expect(bannerRail).toHaveAttribute('data-active-banner-index', '2')
  await expect
    .poll(() => bannerScroller.evaluate((element) => element.scrollLeft))
    .toBeGreaterThan(500)

  const locationButton = page.getByTestId('food-delivery-platform-location')
  await expect(locationButton).toHaveAttribute('aria-expanded', 'false')
  await locationButton.click()
  await expect(page.getByTestId('food-delivery-platform-address-menu')).toBeVisible()
  const alternateAddress = page.getByTestId('food-delivery-platform-address-1')
  const alternateAddressText = (await alternateAddress.innerText()).trim()
  await alternateAddress.click()
  await expect(locationButton).toContainText(alternateAddressText)
  await expect(locationButton).toHaveAttribute('aria-expanded', 'false')

  await page.getByTestId('food-delivery-platform-notifications').click()
  await expect(page.getByTestId('food-delivery-platform-utility-sheet')).toHaveAttribute(
    'data-utility-key',
    'notifications',
  )
  await page.getByTestId('food-delivery-platform-utility-close').click()

  await page.getByTestId('food-delivery-platform-cart').click()
  await expect(page.getByTestId('food-delivery-platform-utility-sheet')).toHaveAttribute(
    'data-utility-key',
    'cart',
  )
  await page.getByTestId('food-delivery-platform-utility-browse').click()
  await expect(page.getByTestId('food-delivery-platform-view-all')).toHaveAttribute(
    'aria-expanded',
    'true',
  )
  await expect(
    page.locator('[data-testid="food-delivery-shop-app-list"] [data-platform-category]'),
  ).toHaveCount(11)
  await expect(page.getByTestId('food-delivery-shop-app-list')).toContainText('莓果晨光')
  await expect(page.getByTestId('food-delivery-shop-app-list')).toContainText('青禾鲜食补给站')
  await expect(page.getByTestId('food-delivery-shop-app-list')).toContainText('早安贝果咖啡')
  await expect(page.getByTestId('food-delivery-shop-app-list')).toContainText('榆树里蒸点铺')
  await expect(page.getByTestId('food-delivery-shop-app-list')).toContainText('南风椰香咖喱')
  await expect(
    page.getByTestId('food-delivery-platform-merchant-card-platform_golden_chicken'),
  ).toHaveAttribute('data-required-asset', /merchant-ad-morning-bagel-01\.webp/)
  await expect(
    page.getByTestId('food-delivery-platform-merchant-card-platform_golden_chicken'),
  ).toHaveAttribute('data-merchant-visual-type', 'ad-cover')

  await page.getByTestId('food-delivery-platform-banner-action-club_free_delivery').click()
  await expect(page).toHaveURL(/platformView=campaign/)
  await expect(page).toHaveURL(/platformCampaign=club_free_delivery/)
  await expect(page.getByTestId('food-delivery-platform-campaign-page')).toBeVisible()
  await expect(page.getByTestId('food-delivery-platform-campaign-merchants')).toContainText(
    '逆站洞韩牛汤饭',
  )
  await page.getByTestId('food-delivery-platform-campaign-primary').click()
  await expect(page.getByTestId('food-delivery-platform-benefit-feedback')).toContainText(
    '权益已加入',
  )
  await page.getByTestId('food-delivery-platform-campaign-back').click()
  await expect(page).not.toHaveURL(/platformView=campaign/)
  await expect(page.getByTestId('food-delivery-platform-banner-rail')).toBeVisible()

  await page.getByTestId('food-delivery-platform-banner-action-weekend_food_map').click()
  await expect(page.getByTestId('food-delivery-platform-campaign-lottery')).toBeVisible()
  await expect(page.getByTestId('food-delivery-platform-campaign-hero')).toHaveAttribute(
    'data-required-asset',
    'platform/campaigns/weekend-lucky-draw-poster-01.png',
  )
  await expect(page.getByTestId('food-delivery-platform-campaign-benefits')).toContainText(
    '三种好运',
  )
  await page.getByTestId('food-delivery-platform-campaign-primary').click()
  await expect(page.getByTestId('food-delivery-platform-campaign-prize')).toBeVisible()
  await expect(page.getByTestId('food-delivery-platform-campaign-prize')).toContainText(
    /满 49 减 8|0 元配送券|甜品加赠签/,
  )
  await page.getByTestId('food-delivery-platform-campaign-back').click()

  await page.getByTestId('food-delivery-platform-banner-action-quick_lunch').click()
  await expect(page.getByTestId('food-delivery-platform-campaign-menu-guide')).toBeVisible()
  await expect(page.getByTestId('food-delivery-platform-campaign-menu-picks')).toContainText(
    'GOOD AM 烟熏鸡贝果',
  )
  await page.getByTestId('food-delivery-platform-campaign-back').click()

  await page.getByTestId('food-delivery-platform-save-platform_hanwoo_gukbap').click()
  await expect(
    page.getByTestId('food-delivery-platform-save-platform_hanwoo_gukbap'),
  ).toHaveAttribute('aria-pressed', 'true')

  await page.getByTestId('food-delivery-platform-nav-search').click()
  await expect(page).toHaveURL(/platformView=search/)
  await expect(page.getByTestId('food-delivery-platform-search-page')).toBeVisible()
  await expect(page.getByTestId('food-delivery-platform-banner-rail')).toHaveCount(0)
  await page.getByTestId('food-delivery-platform-search-input').fill('寿司')
  await expect(page.getByTestId('food-delivery-platform-search-results')).toContainText('寿司花')
  await expect(
    page.getByTestId('food-delivery-platform-merchant-platform_hanwoo_gukbap'),
  ).toHaveCount(0)

  await page.getByTestId('food-delivery-platform-nav-saved').click()
  await expect(page).toHaveURL(/platformView=saved/)
  await expect(page.getByTestId('food-delivery-platform-saved-page')).toBeVisible()
  await expect(page.getByTestId('food-delivery-platform-nav-saved')).toHaveAttribute(
    'aria-current',
    'page',
  )
  await expect(page.getByTestId('food-delivery-platform-saved-grid')).toContainText(
    '逆站洞韩牛汤饭',
  )
  await expect(page.getByTestId('food-delivery-platform-saved-grid')).not.toContainText('寿司花')

  await page.getByTestId('food-delivery-platform-page-back').click()
  await expect(page).not.toHaveURL(/platformView=/)
  await page.getByTestId('food-delivery-select-platform-merchant-platform_hanwoo_gukbap').click()
  await expect(page).toHaveURL(/platformView=merchant/)
  await expect(page).toHaveURL(/platformMerchant=platform_hanwoo_gukbap/)
  await expect(page).not.toHaveURL(/restaurantId=/)
  await expect(page.getByTestId('food-delivery-platform-merchant-page')).toBeVisible()
  await expect(page.getByTestId('food-delivery-platform-bottom-nav')).toHaveCount(0)
  await expect(page.locator('[data-platform-menu-image]')).toHaveCount(5)
  await expect(page.getByTestId('food-delivery-platform-merchant-menu')).toContainText(
    '海风泡菜煎饼',
  )
  await expect(page.locator('[data-platform-menu-image]').first()).toHaveAttribute(
    'data-required-asset',
    'platform/menus/hanwoo-gukbap/menu-item-01.png',
  )
  await expect(page.locator('[data-platform-menu-image]').first()).toHaveClass(/h-28/)
  await expect(page.locator('[data-platform-menu-image]').first().locator('img')).toHaveAttribute(
    'src',
    /platform\/menus\/hanwoo-gukbap\/menu-item-01\.png/,
  )
  const hanwooMenuImages = page.locator('[data-platform-menu-image] img')
  await expect
    .poll(() =>
      hanwooMenuImages.evaluateAll((images) =>
        images.map((image) => ({
          complete: image.complete,
          width: image.naturalWidth,
          height: image.naturalHeight,
          src: image.currentSrc.split('/').pop(),
          missing: image.dataset.assetMissing || null,
        })),
      ),
    )
    .toEqual(
      Array.from({ length: 5 }, (_, index) => ({
        complete: true,
        width: 768,
        height: 768,
        src: `menu-item-${String(index + 1).padStart(2, '0')}.png`,
        missing: null,
      })),
    )
  await testInfo.attach(`baemin-hanwoo-gukbap-menu-${testInfo.project.name}`, {
    body: await page.screenshot(),
    contentType: 'image/png',
  })
  await page.locator('[data-platform-menu-image]').last().scrollIntoViewIfNeeded()
  await testInfo.attach(`baemin-hanwoo-gukbap-menu-end-${testInfo.project.name}`, {
    body: await page.screenshot(),
    contentType: 'image/png',
  })
  await page.getByTestId('food-delivery-platform-menu-add-platform_hanwoo_gukbap_menu_1').click()
  await expect(
    page.getByTestId('food-delivery-platform-menu-quantity-platform_hanwoo_gukbap_menu_1'),
  ).toHaveText('1')
  await page.getByTestId('food-delivery-platform-menu-view-cart').click()
  await expect(page.getByTestId('food-delivery-platform-cart-content')).toBeVisible()
  await expect(
    page.getByTestId('food-delivery-platform-cart-line-platform_hanwoo_gukbap_menu_1'),
  ).toContainText('逆站洞一号韩牛汤饭')
  await expect(page.getByTestId('food-delivery-platform-cart-total')).toContainText('58.00')
  await page
    .getByTestId('food-delivery-platform-cart-increase-platform_hanwoo_gukbap_menu_1')
    .click()
  await expect(
    page.getByTestId('food-delivery-platform-cart-quantity-platform_hanwoo_gukbap_menu_1'),
  ).toHaveText('2')
  await page.getByTestId('food-delivery-platform-cart-checkout').click()
  await expect(page).toHaveURL(/platformView=checkout/)
  await expect(page.getByTestId('food-delivery-platform-checkout-page')).toBeVisible()
  await expect(page.getByTestId('food-delivery-platform-checkout-total')).toContainText('116.00')
  await expect(page.locator('[data-asset-slot="platform-checkout-takeout-bag"]')).toBeVisible()
  const checkoutArtwork = page.locator('[data-asset-slot="platform-checkout-takeout-bag"] img')
  await expect(checkoutArtwork).toHaveAttribute(
    'src',
    /platform\/orders\/platform-checkout-takeout-bag-01\.png/,
  )
  await expect(checkoutArtwork).not.toHaveAttribute('data-asset-missing', 'true')
  await expect
    .poll(() =>
      checkoutArtwork.evaluate((image) => ({
        complete: image.complete,
        width: image.naturalWidth,
        height: image.naturalHeight,
      })),
    )
    .toEqual({ complete: true, width: 1024, height: 1024 })
  await expect(page.getByTestId('food-delivery-platform-bottom-nav')).toHaveCount(0)
  await expectNoHorizontalOverflow(page)

  await page.getByTestId('food-delivery-platform-checkout-address-1').click()
  await expect(page.getByTestId('food-delivery-platform-checkout-address')).toContainText('麻浦区')
  await page.getByTestId('food-delivery-platform-checkout-note').fill('少辣，放门口')
  await page.getByTestId('food-delivery-platform-payment-pay_on_delivery').click()
  await page.getByTestId('food-delivery-platform-checkout-submit').click()

  await expect(page).toHaveURL(/platformView=order/)
  await expect(page).toHaveURL(/platformOrderId=/)
  await expect(page.getByTestId('food-delivery-platform-order-success')).toContainText('下单成功')
  await expect(page.getByTestId('food-delivery-platform-order-success')).toHaveAttribute(
    'data-order-status',
    'placed',
  )
  await expect(page.locator('[data-asset-slot="platform-order-status-placed"]')).toBeVisible()
  const placedArtwork = page.locator('[data-asset-slot="platform-order-status-placed"] img')
  await expect(placedArtwork).toHaveAttribute(
    'src',
    /platform\/orders\/platform-order-status-placed-01\.png/,
  )
  await expect(placedArtwork).not.toHaveAttribute('data-asset-missing', 'true')
  await expect
    .poll(() =>
      placedArtwork.evaluate((image) => ({
        complete: image.complete,
        width: image.naturalWidth,
        height: image.naturalHeight,
      })),
    )
    .toEqual({ complete: true, width: 1024, height: 1024 })
  await expect(page.getByTestId('food-delivery-platform-bottom-nav')).toHaveCount(0)
  await expect(page.getByTestId('food-delivery-platform-order-summary')).toContainText(
    '逆站洞一号韩牛汤饭',
  )
  await expect(page.getByTestId('food-delivery-platform-order-summary')).toContainText('116.00')
  const orderId = await page
    .getByTestId('food-delivery-platform-order-id')
    .getAttribute('data-order-id')
  await expect(page.getByTestId('food-delivery-platform-order-id')).toHaveText(
    /^FD\d{6}-[A-Z0-9]{4}$/,
  )
  await expectNoHorizontalOverflow(page)

  await page.getByTestId('food-delivery-platform-view-orders').click()
  await expect(page).toHaveURL(/platformView=orders/)
  await expect(page.getByTestId('food-delivery-platform-order-list')).toContainText(
    '逆站洞韩牛汤饭',
  )
  const merchantMarkImage = page.locator(
    '[data-asset-slot="platform-merchant-mark-platform_hanwoo_gukbap"] img',
  )
  await expect(merchantMarkImage).toHaveAttribute(
    'src',
    /platform\/orders\/merchant-marks\/platform-merchant-mark-hanwoo-01\.png/,
  )
  await expect
    .poll(() =>
      merchantMarkImage.evaluate((image) => ({
        complete: image.complete,
        width: image.naturalWidth,
        height: image.naturalHeight,
        missing: image.dataset.assetMissing || null,
      })),
    )
    .toEqual({ complete: true, width: 768, height: 768, missing: null })
  await expect(page.getByTestId('food-delivery-platform-bottom-nav')).toBeVisible()
  await page.getByTestId(`food-delivery-platform-order-card-${orderId}`).click()
  await expect(page.getByTestId('food-delivery-platform-order-id')).toHaveAttribute(
    'data-order-id',
    orderId,
  )

  await page.getByTestId('food-delivery-platform-order-back').click()
  await page.getByTestId('food-delivery-platform-nav-profile').click()
  await expect(page).toHaveURL(/platformView=profile/)
  await expect(page.getByTestId('food-delivery-platform-profile-page')).toBeVisible()
  await expect(page.getByTestId('food-delivery-platform-profile-services')).toContainText(
    '配送与沟通',
  )
  await expect(page.getByTestId('food-delivery-platform-profile-membership')).toBeVisible()
  await page.getByTestId('food-delivery-platform-profile-address-1').click()
  await expect(page.getByTestId('food-delivery-platform-profile-addresses')).toContainText('麻浦区')

  await page.getByTestId('food-delivery-platform-nav-orders').click()
  await expect(page).toHaveURL(/platformView=orders/)
  await expect(page.getByTestId('food-delivery-platform-orders-page')).toBeVisible()
  await expectNoHorizontalOverflow(page)
  expect(pageErrors).toEqual([])
})

test('Food Platform returns to the originating Home screen after internal navigation', async ({
  page,
}, testInfo) => {
  test.setTimeout(180_000)
  await unlockToHome(page)
  await navigateInsideUnlockedApp(page, '/food-delivery?category=nearby&from=home&homePage=3')

  await page.getByTestId('food-delivery-platform-nav-search').click()
  await expect(page).toHaveURL(/platformView=search/)
  await expect(page).toHaveURL(/from=home/)
  await expect(page).toHaveURL(/homePage=3/)

  await page.getByTestId('food-delivery-platform-search-input').fill('寿司')
  await page.getByTestId('food-delivery-select-platform-merchant-platform_sushi_hana').click()
  await expect(page).toHaveURL(/platformView=merchant/)
  await expect(page).toHaveURL(/platformMerchant=platform_sushi_hana/)
  await expect(page).toHaveURL(/homePage=3/)
  await expect(page.locator('[data-platform-menu-image]')).toHaveCount(5)
  await expect(page.locator('[data-platform-menu-image]').first()).toHaveAttribute(
    'data-required-asset',
    'platform/menus/sushi-hana/menu-item-01.png',
  )
  const sushiMenuImages = page.locator('[data-platform-menu-image] img')
  await expect
    .poll(() =>
      sushiMenuImages.evaluateAll((images) =>
        images.map((image) => ({
          complete: image.complete,
          width: image.naturalWidth,
          height: image.naturalHeight,
          src: image.currentSrc.split('/').pop(),
          missing: image.dataset.assetMissing || null,
        })),
      ),
    )
    .toEqual(
      Array.from({ length: 5 }, (_, index) => ({
        complete: true,
        width: 768,
        height: 768,
        src: `menu-item-${String(index + 1).padStart(2, '0')}.png`,
        missing: null,
      })),
    )
  await testInfo.attach(`baemin-sushi-hana-menu-${testInfo.project.name}`, {
    body: await page.screenshot(),
    contentType: 'image/png',
  })
  await page.locator('[data-platform-menu-image]').last().scrollIntoViewIfNeeded()
  await testInfo.attach(`baemin-sushi-hana-menu-end-${testInfo.project.name}`, {
    body: await page.screenshot(),
    contentType: 'image/png',
  })
  await expectNoHorizontalOverflow(page)

  await page.getByTestId('food-delivery-platform-merchant-back').click()
  await expect(page.getByTestId('food-delivery-platform-search-page')).toBeVisible()
  await expect(page).toHaveURL(/homePage=3/)
  await page.getByTestId('food-delivery-platform-page-back').click()
  await page.getByTestId('food-delivery-go-home').click()

  await expect(page).toHaveURL(/#\/home\?homePage=3$/)
})

test('Food Platform serves every menu family and loads the selected texture fixes', async ({
  page,
}) => {
  test.setTimeout(180_000)
  const pageErrors = []
  page.on('pageerror', (error) => {
    pageErrors.push(error.message)
  })

  const merchants = [
    ['platform_hanwoo_gukbap', 'hanwoo-gukbap'],
    ['platform_sushi_hana', 'sushi-hana'],
    ['platform_hwadeok_pizza', 'hwadeok-pizza'],
    ['platform_salad_day', 'salad-day'],
    ['platform_chicken_crisp', 'chicken-crisp'],
    ['platform_berry_morning', 'berry-morning'],
    ['platform_green_basket', 'green-basket'],
    ['platform_neighborhood_soup', 'camellia-noodles'],
    ['platform_golden_chicken', 'morning-bagel'],
    ['platform_nori_table', 'elm-dim-sum'],
    ['platform_corner_pizza', 'coconut-curry'],
  ]

  const menuAssets = merchants.flatMap(([, assetKey]) =>
    Array.from(
      { length: 5 },
      (_, index) => {
        const assetPath = `apps/food-delivery/platform/menus/${assetKey}/menu-item-${String(index + 1).padStart(2, '0')}.png`
        return { assetPath, url: projectUiAssetUrl(assetPath) }
      },
    ),
  )
  const assetResponses = []
  for (let offset = 0; offset < menuAssets.length; offset += 8) {
    const batch = await Promise.all(
      menuAssets.slice(offset, offset + 8).map(async ({ assetPath, url }) => {
        let response
        for (let attempt = 0; attempt < 3; attempt += 1) {
          response = await page.request.get(url)
          if (response.status() < 500) break
          await page.waitForTimeout(250 * (attempt + 1))
        }
        return {
          assetPath,
          status: response.status(),
          contentType: response.headers()['content-type'] || '',
        }
      }),
    )
    assetResponses.push(...batch)
  }
  expect(
    assetResponses.filter(
      (response) => response.status !== 200 || !response.contentType.startsWith('image/png'),
    ),
  ).toEqual([])

  await unlockToHome(page)
  const textureFixMerchants = [
    ['platform_hwadeok_pizza', 'hwadeok-pizza'],
    ['platform_chicken_crisp', 'chicken-crisp'],
    ['platform_golden_chicken', 'morning-bagel'],
  ]
  for (const [merchantId, assetKey] of textureFixMerchants) {
    await navigateInsideUnlockedApp(
      page,
      `/food-delivery?category=nearby&platformView=merchant&platformMerchant=${merchantId}`,
    )
    await expect(page.getByTestId('food-delivery-platform-merchant-page')).toBeVisible()
    const menuImages = page.locator('[data-platform-menu-image] img')
    await expect(menuImages).toHaveCount(5)
    await expect
      .poll(() =>
        menuImages.evaluateAll((images) =>
          images.map((image) => ({
            complete: image.complete,
            width: image.naturalWidth,
            height: image.naturalHeight,
            src: image.currentSrc.split('/').pop(),
            missing: image.dataset.assetMissing || null,
          })),
        ),
      )
      .toEqual(
        Array.from({ length: 5 }, (_, index) => ({
          complete: true,
          width: 768,
          height: 768,
          src: `menu-item-${String(index + 1).padStart(2, '0')}.png`,
          missing: null,
        })),
      )
    await expect(menuImages.first()).toHaveAttribute(
      'src',
      new RegExp(`platform/menus/${assetKey}/menu-item-01\\.png`),
    )
    await expectNoHorizontalOverflow(page)
  }

  expect(pageErrors).toEqual([])
})
