import { expect, test } from '@playwright/test'
import { navigateInsideUnlockedApp, unlockToHome } from './helpers/navigation'

const trackCommercialMapRequests = (page) => {
  const requests = []
  page.on('request', (request) => {
    const hostname = new URL(request.url()).hostname
    if (
      /(^|\.)(kakao\.com|daumcdn\.net|mapbox\.com|googleapis\.com|openstreetmap\.org|geoapify\.com|locationiq\.com)$/i.test(
        hostname,
      )
    ) {
      requests.push(request.url())
    }
  })
  return requests
}

test.describe('world-bound local narrative maps', () => {
  test('uses Seoul for the default world and creates places through explicit placement', async ({ page }) => {
    const commercialMapRequests = trackCommercialMapRequests(page)
    await unlockToHome(page)
    await navigateInsideUnlockedApp(page, '/map')

    const mapCanvas = page.getByTestId('map-primary-canvas')
    await expect(mapCanvas.locator('[data-map-pack="real-seoul-v1"]')).toBeVisible()
    await expect(page.locator('[data-testid^="map-pack-"]')).toHaveCount(0)
    const baseMapImage = mapCanvas.locator('.leaflet-image-layer')
    await expect(baseMapImage).toBeVisible()
    await expect.poll(() => baseMapImage.evaluate((image) => image.complete && image.naturalWidth > 0)).toBe(true)

    const destination = page.getByTestId('map-destination-search')
    await destination.fill('SM')
    await expect(page.getByTestId('map-local-place-results')).toBeVisible()
    await page.getByTestId('map-local-place-results').locator('button').first().click()
    await expect(page.getByTestId('map-place-detail-sheet')).toContainText(/SM Entertainment|SM 娱乐/)
    await expect(destination).toHaveValue('SM')
    await page.getByTestId('map-place-use-destination').click()
    await expect(destination).not.toHaveValue('SM')

    await page.getByTestId('map-secondary-menu').getByRole('button', { name: /Places|地点/ }).click()
    await expect(page.getByTestId('map-secondary-drawer')).toBeVisible()
    await page.getByTestId('map-add-place-drawer').click()
    const creator = page.getByTestId('map-place-creator')
    await creator.getByTestId('map-place-name').fill('Relay studio')
    await creator.getByTestId('map-place-detail').fill('Seongdong rehearsal building 3F')
    await creator.getByRole('button', { name: /Work|工作/ }).click()
    await creator.getByTestId('map-choose-pin').click()
    await expect(page.getByTestId('map-placement-mode')).toBeVisible()
    await expect(page.getByTestId('map-secondary-drawer')).toHaveCount(0)

    const leaflet = page.getByTestId('map-scene-leaflet')
    const bounds = await leaflet.boundingBox()
    expect(bounds).toBeTruthy()
    await leaflet.click({
      force: true,
      position: { x: bounds.width * 0.72, y: bounds.height * 0.43 },
    })
    await expect(page.getByTestId('map-place-creator')).toBeVisible()
    await expect(page.getByTestId('map-pending-pin-status')).toBeVisible()
    await page.getByTestId('map-save-address').click()
    await expect(page.getByTestId('map-place-detail-sheet')).toContainText('Relay studio')

    await page.getByTestId('map-place-detail-sheet').getByRole('button', { name: /Close|关闭/ }).click()
    await mapCanvas.locator('.leaflet-marker-icon[title="Relay studio"]').click({ force: true })
    await expect(page.getByTestId('map-place-detail-sheet')).toContainText('Seongdong rehearsal building 3F')

    await page.getByTestId('map-place-detail-sheet').getByRole('button', { name: /Close|关闭/ }).click()
    await page.getByTestId('map-open-settings').click()
    await expect(page).toHaveURL(/#\/map\/settings/)
    await expect(page.getByTestId('map-current-source')).toContainText(/现实首尔|Real Seoul/)
    await expect(page.getByTestId('map-open-import')).toBeVisible()
    await expect(page.getByTestId('map-open-generate')).toBeVisible()
    await expect(page.getByTestId('map-open-visual-settings')).toBeVisible()

    await page.getByTestId('map-open-import').click()
    await expect(page.getByTestId('map-import-dialog')).toBeVisible()
    await page.getByTestId('map-import-dialog').getByRole('button', { name: /Close|关闭/ }).click()
    await page.getByTestId('map-open-generate').click()
    await expect(page.getByTestId('map-generate-dialog')).toBeVisible()

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    expect(overflow).toBeLessThanOrEqual(1)
    expect(commercialMapRequests).toEqual([])
  })

  test('activates the cyber wasteland through its world instead of a map switcher', async ({ page }) => {
    const commercialMapRequests = trackCommercialMapRequests(page)
    await unlockToHome(page)
    await navigateInsideUnlockedApp(page, '/worldbook')
    await page.getByTestId('worldbook-panel-tab-pack').click()
    await page.getByTestId('worldbook-current-pack-select').selectOption('survival_city')
    await page.getByTestId('worldbook-current-pack-activate').click()

    await navigateInsideUnlockedApp(page, '/map')
    const mapCanvas = page.getByTestId('map-primary-canvas')
    await expect(mapCanvas.locator('[data-map-pack="cyber-wasteland-v1"]')).toBeVisible()
    await expect(page.locator('[data-testid^="map-pack-"]')).toHaveCount(0)
    await expect(mapCanvas.locator('.map-scene-faction-label')).toHaveCount(4)
    await expect(mapCanvas).toContainText(/灾后生存都市|Survival City/)

    await page.getByTestId('map-destination-search').fill('Ash')
    await page.getByTestId('map-local-place-results').locator('button').first().click()
    await expect(page.getByTestId('map-place-detail-sheet')).toContainText(/灰烬集市|Ash Market/)

    await page.getByTestId('map-place-detail-sheet').getByRole('button', { name: /Close|关闭/ }).click()
    await page.getByTestId('map-open-settings').click()
    await expect(page.getByTestId('map-current-source')).toContainText(/赤锈废都|Redrust Expanse/)
    expect(commercialMapRequests).toEqual([])
  })

  test('edits saved pin coordinates and preserves the Map settings return chain', async ({ page }) => {
    await unlockToHome(page)
    await navigateInsideUnlockedApp(page, '/map?from=home&homePage=1')

    await page.getByTestId('map-open-settings').click()
    await expect(page).toHaveURL(/#\/map\/settings\?from=home&homePage=1/)
    await page.getByTestId('map-open-place-settings').click()
    await expect(page).toHaveURL(/#\/map\/settings\/places\?from=home&homePage=1/)

    await page.getByTestId('map-user-pin-1').click()
    await page.getByTestId('map-pin-name').fill('Seoul home')
    await page.getByTestId('map-pin-reselect-coordinate').click()
    await expect(page.getByTestId('map-pin-coordinate-mode')).toBeVisible()
    const pinMap = page.getByTestId('map-pin-management-canvas').getByTestId('map-scene-leaflet')
    const bounds = await pinMap.boundingBox()
    expect(bounds).toBeTruthy()
    await pinMap.click({
      force: true,
      position: { x: bounds.width * 0.58, y: bounds.height * 0.46 },
    })
    await expect(page.getByTestId('map-pin-editor')).toBeVisible()
    await page.getByTestId('map-pin-save').click()
    await expect(page.getByTestId('map-user-pin-1')).toContainText('Seoul home')

    await page.getByTestId('map-pin-settings-back').click()
    await expect(page).toHaveURL(/#\/map\/settings\?from=home&homePage=1/)
    await page.getByRole('button', { name: /Back to Map|返回地图/ }).click()
    await expect(page).toHaveURL(/#\/map\?from=home&homePage=1/)

    await page.getByTestId('map-open-settings').click()
    await page.getByTestId('map-open-visual-settings').click()
    await expect(page).toHaveURL(/#\/map\?source=map-settings&panel=visual/)
    await page.getByTestId('map-visual-return-settings').click()
    await expect(page).toHaveURL(/#\/map\/settings/)

    await page.getByRole('button', { name: /World settings|世界观设置/ }).click()
    await expect(page).toHaveURL(/#\/worldbook\?source=map-settings&panel=pack/)
    await page.locator('.worldbook-nav-button').click()
    await expect(page).toHaveURL(/#\/map\/settings$/)
  })

  test('keeps map coordinate selection usable during an active trip', async ({ page }) => {
    await unlockToHome(page)
    await navigateInsideUnlockedApp(page, '/map')
    await page.getByTestId('map-destination-search').fill('Trip destination')
    await expect(page.getByTestId('map-primary-start-trip')).toBeEnabled()
    await page.getByTestId('map-primary-start-trip').click()
    await expect(page.getByTestId('map-primary-start-trip')).toContainText(/In transit|进行中/)

    await page.getByTestId('map-add-place').click()
    await page.getByTestId('map-place-name').fill('Trip stop')
    await page.getByTestId('map-place-detail').fill('A stop added during travel')
    await page.getByTestId('map-choose-pin').click()
    await expect(page.getByTestId('map-placement-mode')).toBeVisible()

    const leaflet = page.getByTestId('map-scene-leaflet')
    const bounds = await leaflet.boundingBox()
    expect(bounds).toBeTruthy()
    await leaflet.click({
      force: true,
      position: { x: bounds.width * 0.64, y: bounds.height * 0.52 },
    })
    await expect(page.getByTestId('map-place-creator')).toBeVisible()
    await expect(page.getByTestId('map-pending-pin-status')).toBeVisible()
  })

  test('compares the local Seoul pack with a contained Kakao configuration state', async ({ page }) => {
    const commercialMapRequests = trackCommercialMapRequests(page)
    await unlockToHome(page)
    await navigateInsideUnlockedApp(page, '/map/settings?from=home&homePage=1')

    await page.getByTestId('map-open-kakao-compare').click()
    await expect(page).toHaveURL(/#\/map\/labs\/kakao-compare\?from=home&homePage=1/)
    await expect(page.getByTestId('map-compare-local-panel')).toBeVisible()
    await expect(page.getByTestId('map-compare-kakao-panel')).toBeVisible()
    await expect(page.getByTestId('kakao-map-canvas')).toHaveAttribute('data-status', 'unconfigured')
    await expect(page.getByTestId('map-compare-local-panel').locator('.leaflet-image-layer')).toBeVisible()
    expect(commercialMapRequests).toEqual([])

    await page.getByTestId('map-compare-mode-kakao').click()
    await expect(page.getByTestId('map-compare-local-panel')).toHaveCount(0)
    await expect(page.getByTestId('map-compare-kakao-panel')).toBeVisible()
    await page.getByTestId('map-compare-mode-local').click()
    await expect(page.getByTestId('map-compare-local-panel')).toBeVisible()
    await expect(page.getByTestId('map-compare-kakao-panel')).toHaveCount(0)

    await page.getByRole('button', { name: /Back to Map settings|返回地图设置/ }).click()
    await expect(page).toHaveURL(/#\/map\/settings\?from=home&homePage=1/)
  })
})
