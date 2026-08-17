import { expect, test } from '@playwright/test'
import { projectUiAssetUrl } from '../src/lib/project-assets.js'
import { navigateInsideUnlockedApp, unlockToHome } from './helpers/navigation.js'
import {
  installProjectAssetRoute,
  prewarmProjectAssets,
  prewarmRequiredProjectAssets,
} from './helpers/project-assets.js'

const OPENFREEMAP_HOST = 'tiles.openfreemap.org'
const DETERMINISTIC_STYLE = {
  version: 8,
  name: 'SchatPhone deterministic real-shop map style',
  sources: {},
  layers: [
    {
      id: 'background',
      type: 'background',
      paint: { 'background-color': '#dbe5df' },
    },
  ],
}

const expectNoHorizontalOverflow = async (page) => {
  const overflow = await page.evaluate(() => ({
    document: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    body: document.body.scrollWidth - document.body.clientWidth,
  }))
  expect(overflow.document).toBeLessThanOrEqual(1)
  expect(overflow.body).toBeLessThanOrEqual(1)
}

const expectLoadedFolderImages = async (page) => {
  await expect
    .poll(() =>
      page.locator('.home-folder-entry-image').evaluateAll((images) =>
        images.every(
          (image) =>
            image instanceof HTMLImageElement &&
            image.complete &&
            image.naturalWidth > 0 &&
            image.naturalHeight > 0,
        ),
      ),
    )
    .toBe(true)
}

const openFoodFolderPageTwo = async (page) => {
  await page.getByTestId('home-folder-app_food_delivery').click()
  const panel = page.locator('.home-folder-panel')
  await expect(panel).toHaveAttribute('data-folder-page', '1')
  await expect(page.locator('.home-folder-entry')).toHaveCount(9)
  await expectLoadedFolderImages(page)
  await page.getByTestId('home-folder-page-next').click()
  await expect(panel).toHaveAttribute('data-folder-page', '2')
  await expect(page.locator('.home-folder-entry')).toHaveCount(6)
  await expectLoadedFolderImages(page)
  return panel
}

const readFoodDeliverySnapshot = async (page) =>
  page.evaluate(() => JSON.parse(window.localStorage.getItem('schatphone:store:food-delivery')))

const foodFolderIconPaths = [
  'apps/food-delivery/moon-bistro/brand/moon-bistro-app-icon-01.webp',
  'apps/food-delivery/river-noodles/brand/river-noodles-app-icon-01.webp',
  'apps/food-delivery/daylight-cafe/brand/daylight-cafe-app-icon-01.webp',
  'apps/food-delivery/harbor-roast/brand/harbor-roast-app-icon-01.png',
  'apps/food-delivery/sugar-lane/brand/sugar-lane-app-icon-01.webp',
  'apps/food-delivery/peach-cloud/brand/peach-cloud-mark-01.svg',
  'apps/food-delivery/dash-grill/brand/dash-grill-app-icon-01.webp',
  'apps/food-delivery/jade-hearth/brand/jade-hearth-app-icon-01.webp',
  'apps/food-delivery/verdant-day/brand/verdant-day-app-icon-01.webp',
  'apps/food-delivery/myeongdong-kyoja/brand/myeongdong-kyoja-app-icon-01.webp',
  'apps/food-delivery/london-bagel-museum/brand/london-bagel-museum-app-icon-01.webp',
  'apps/food-delivery/knotted/brand/knotted-app-icon-01.webp',
  'apps/food-delivery/kyochon-chicken/brand/kyochon-chicken-app-icon-01.webp',
  'apps/food-delivery/eggdrop/brand/eggdrop-app-icon-01.webp',
]

test('Home page two opens real shops and keeps their bags and orders independent', async ({
  page,
}, testInfo) => {
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
  await navigateInsideUnlockedApp(page, '/home?homePage=1')
  await prewarmProjectAssets(
    page.request,
    foodFolderIconPaths.map((path) => projectUiAssetUrl(path)),
  )
  await installProjectAssetRoute(page)
  let panel = await openFoodFolderPageTwo(page)

  await page.getByTestId('home-folder-page-previous').click()
  await expect(panel).toHaveAttribute('data-folder-page', '1')
  await page.getByTestId('home-folder-page-next').click()
  await expect(panel).toHaveAttribute('data-folder-page', '2')

  const realShopEntryIds = [
    'food_seed_myeongdong_kyoja',
    'food_seed_london_bagel_museum',
    'food_seed_knotted',
    'food_seed_kyochon_chicken',
    'food_seed_eggdrop',
  ]
  for (const restaurantId of realShopEntryIds) {
    const entry = page.getByTestId(`home-folder-entry-shop_app_${restaurantId}`)
    await expect(entry).toBeVisible()
    const image = entry.locator('img')
    await expect(image).toHaveClass(/is-full-bleed/)
  }
  await expectNoHorizontalOverflow(page)
  await testInfo.attach(`food-folder-page-2-${testInfo.project.name}`, {
    body: await page.screenshot(),
    contentType: 'image/png',
  })

  await page.getByTestId('home-folder-entry-shop_app_food_seed_eggdrop').click()
  await expect(page).toHaveURL(/restaurantId=food_seed_eggdrop/)
  await prewarmRequiredProjectAssets(page)
  const eggdropRoute = await page.evaluate(() => window.location.hash.slice(1))
  await navigateInsideUnlockedApp(page, '/settings')
  await navigateInsideUnlockedApp(page, eggdropRoute)
  await expect(page).toHaveURL(/restaurantId=food_seed_eggdrop/)
  await expect(page.getByTestId('food-delivery-store-shell')).toHaveAttribute(
    'data-store-template',
    'standard',
  )
  await testInfo.attach(`eggdrop-store-${testInfo.project.name}`, {
    body: await page.screenshot(),
    contentType: 'image/png',
  })
  const eggdropAdd = page.locator('[data-testid^="food-delivery-add-"]').first()
  const eggdropTitle = (await eggdropAdd.getAttribute('aria-label')).replace(/^Add /, '')
  await eggdropAdd.click()
  await expect(page.getByTestId('food-delivery-cart-panel')).toContainText(eggdropTitle)

  await page.getByTestId('food-delivery-store-home').click()
  await expect(page).toHaveURL(/#\/home\?homePage=1$/)
  panel = await openFoodFolderPageTwo(page)
  await page.getByTestId('home-folder-entry-shop_app_food_seed_kyochon_chicken').click()
  await expect(page).toHaveURL(/restaurantId=food_seed_kyochon_chicken/)
  await prewarmRequiredProjectAssets(page)
  const kyochonRoute = await page.evaluate(() => window.location.hash.slice(1))
  await navigateInsideUnlockedApp(page, '/settings')
  await navigateInsideUnlockedApp(page, kyochonRoute)
  await expect(page).toHaveURL(/restaurantId=food_seed_kyochon_chicken/)
  const kyochonAdd = page.locator('[data-testid^="food-delivery-add-"]').first()
  const kyochonTitle = (await kyochonAdd.getAttribute('aria-label')).replace(/^Add /, '')
  await kyochonAdd.click()
  const kyochonBag = page.getByTestId('food-delivery-cart-panel')
  await expect(kyochonBag).toContainText(kyochonTitle)
  await expect(kyochonBag).not.toContainText(eggdropTitle)
  await page.getByTestId('food-delivery-checkout').click()
  await page.getByTestId('food-delivery-checkout-submit').click()
  await expect
    .poll(async () => {
      const snapshot = await readFoodDeliverySnapshot(page)
      return snapshot?.data?.orders?.some(
        (order) => order.restaurantId === 'food_seed_kyochon_chicken',
      )
    })
    .toBe(true)

  await page.getByTestId('food-delivery-store-home').click()
  await expect(page).toHaveURL(/#\/home\?homePage=1$/)
  await openFoodFolderPageTwo(page)
  await page.getByTestId('home-folder-entry-shop_app_food_seed_eggdrop').click()
  const eggdropBag = page.getByTestId('food-delivery-cart-panel')
  await expect(eggdropBag).toContainText(eggdropTitle)
  await expect(eggdropBag).not.toContainText(kyochonTitle)
  await page.getByTestId('food-delivery-checkout').click()
  await page.getByTestId('food-delivery-checkout-submit').click()

  await expect
    .poll(async () => {
      const snapshot = await readFoodDeliverySnapshot(page)
      return snapshot?.data?.orders?.map((order) => order.restaurantId).sort() || []
    })
    .toEqual(['food_seed_eggdrop', 'food_seed_kyochon_chicken'])
  await expectNoHorizontalOverflow(page)
  expect(pageErrors).toEqual([])

  await testInfo.attach(`food-real-shops-${testInfo.project.name}`, {
    body: await page.screenshot(),
    contentType: 'image/png',
  })
})

test('Map searches, focuses, and selects all five real shops as destinations', async ({
  page,
}, testInfo) => {
  const pageErrors = []
  page.on('pageerror', (error) => pageErrors.push(error.message))
  await page.route(`https://${OPENFREEMAP_HOST}/**`, async (route) => {
    const { pathname } = new URL(route.request().url())
    if (pathname === '/styles/liberty') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(DETERMINISTIC_STYLE),
      })
      return
    }
    await route.abort('blockedbyclient')
  })

  await unlockToHome(page)
  await navigateInsideUnlockedApp(page, '/map')
  await installProjectAssetRoute(page)
  const destination = page.getByTestId('map-destination-search')
  const searchResults = page.getByTestId('map-local-place-results')
  const cases = [
    ['Myeongdong Kyoja', /Myeongdong Kyoja|明洞饺子/, /明洞 10街 29|29 Myeongdong 10-gil/],
    ['LBM Anguk', /London Bagel Museum|伦敦贝果博物馆/, /北村路 4街 20|20 Bukchon-ro 4-gil/],
    ['노티드 청담', /Knotted|清潭/, /岛山大路 53街 15|15 Dosan-daero 53-gil/],
    ['Kyochon Yeoksam', /Kyochon Chicken|桥村炸鸡/, /江南大路 66街 16|16 Gangnam-daero 66-gil/],
    ['에그 샌드위치', /EGGDROP|江南宇成/, /江南大路 321|321 Gangnam-daero/],
  ]

  for (const [query, expectedName, expectedAddress] of cases) {
    await destination.fill(query)
    await expect(searchResults).toBeVisible()
    const result = searchResults.locator('.map-place-result').filter({ hasText: expectedName }).first()
    await expect(result).toBeVisible()
    await result.click()
    const detail = page.getByTestId('map-place-detail-sheet')
    await expect(detail).toBeVisible()
    await expect(detail).toContainText(expectedName)
    await detail.getByTestId('map-place-use-destination').click()
    await expect(page.getByTestId('map-primary-route-card')).toContainText(expectedAddress)
  }

  await expectNoHorizontalOverflow(page)
  expect(pageErrors).toEqual([])
  await testInfo.attach(`map-real-food-shops-${testInfo.project.name}`, {
    body: await page.screenshot(),
    contentType: 'image/png',
  })
})
