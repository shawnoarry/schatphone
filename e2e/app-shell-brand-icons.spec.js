import { expect, test } from '@playwright/test'
import { projectUiAssetUrl } from '../src/lib/project-assets.js'
import { navigateInsideUnlockedApp, unlockToHome, waitForAppRouteReady } from './helpers/navigation.js'
import { installProjectAssetRoute, prewarmProjectAssets } from './helpers/project-assets.js'

const BRAND_ICONS = [
  ['app_browser', 'prism-browser-app-icon-v1.png'],
  ['app_community', 'ripple-community-app-icon-v1.png'],
  ['app_healthcare', 'ondam-care-app-icon-v2.png'],
  ['app_jari_housing', 'jari-housing-app-icon-v1.png'],
]

const seedSystem = async (page) => {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      'schatphone:store:system',
      JSON.stringify({
        version: 1,
        savedAt: Date.now(),
        data: {
          settings: {
            system: { language: 'zh-CN', notifications: false, realPushEnabled: false },
            appearance: { currentTheme: 'default', wallpaperMode: 'theme' },
          },
        },
      }),
    )
  })
}

const expectLoadedBrandImage = async (image, fileName) => {
  await expect(image).toHaveAttribute('src', new RegExp(`${fileName.replaceAll('.', '\\.')}($|\\?)`))
  await expect
    .poll(() => image.evaluate((element) => element.complete && element.naturalWidth > 0))
    .toBe(true)
}

test.beforeEach(async ({ page }) => {
  await seedSystem(page)
  await prewarmProjectAssets(
    page.request,
    BRAND_ICONS.map(([, fileName]) => projectUiAssetUrl(`shared/app-icons/${fileName}`)),
  )
  await installProjectAssetRoute(page)
  await unlockToHome(page)
})

test('Home uses the four accepted app-shell brand images', async ({ page }) => {
  await navigateInsideUnlockedApp(page, '/home?homePage=1')
  await waitForAppRouteReady(page, '/home')

  for (const [appId, fileName] of BRAND_ICONS) {
    const tile = page.locator(`[data-home-tile-id="${appId}"]`)
    await expect(tile).toBeVisible()
    await expectLoadedBrandImage(tile.locator('img'), fileName)
  }
})

test('App Store uses the same accepted app-shell brand images', async ({ page }) => {
  await navigateInsideUnlockedApp(page, '/app-store?homePage=1&from=home')
  await waitForAppRouteReady(page, '/app-store')

  for (const [appId, fileName] of BRAND_ICONS) {
    const item = page.getByTestId(`app-store-item-${appId}`)
    await expect(item).toBeVisible()
    await expectLoadedBrandImage(item.locator('img'), fileName)
  }
})
