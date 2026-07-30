import { fileURLToPath } from 'node:url'
import { expect, test } from '@playwright/test'
import { navigateInsideUnlockedApp, unlockToHome } from './helpers/navigation'

const OPENFREEMAP_HOST = 'tiles.openfreemap.org'
const CUSTOM_MAP_FIXTURE = fileURLToPath(
  new URL('../public/images/ui-assets/apps/map/seoul-street-map-v1.webp', import.meta.url),
)
const DETERMINISTIC_STYLE = {
  version: 8,
  name: 'SchatPhone deterministic map style',
  sources: {},
  layers: [
    {
      id: 'background',
      type: 'background',
      paint: { 'background-color': '#dbe5df' },
    },
  ],
}

const trackMapRuntimeRequests = (page) => {
  const requests = {
    openFreeMap: [],
    maplibreModules: [],
  }
  page.on('request', (request) => {
    const url = request.url()
    if (!/^https?:/i.test(url)) return
    const parsed = new URL(url)
    if (parsed.hostname === OPENFREEMAP_HOST) requests.openFreeMap.push(url)
    if (/maplibre/i.test(parsed.pathname)) requests.maplibreModules.push(url)
  })
  return requests
}

const mockOpenFreeMapStyle = async (page) => {
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
}

const clickMapLibreCanvas = async (scope, xRatio, yRatio) => {
  const canvas = scope.locator('.maplibregl-canvas')
  await expect(canvas).toBeVisible()
  const bounds = await canvas.boundingBox()
  expect(bounds).toBeTruthy()
  await canvas.click({
    force: true,
    position: { x: bounds.width * xRatio, y: bounds.height * yRatio },
  })
}

test.describe('world-bound narrative maps', () => {
  test('renders geographic Seoul with MapLibre and creates canonical places', async ({ page }) => {
    await mockOpenFreeMapStyle(page)
    const requests = trackMapRuntimeRequests(page)
    await unlockToHome(page)
    await navigateInsideUnlockedApp(page, '/map')

    const mapCanvas = page.getByTestId('map-primary-canvas')
    const renderer = mapCanvas.locator('[data-renderer="openfreemap"]')
    await expect(renderer).toBeVisible({ timeout: 15000 })
    await expect(renderer.locator('.maplibregl-canvas')).toBeVisible()
    await expect(renderer.locator('.openfreemap-marker-button')).not.toHaveCount(0)
    expect(requests.openFreeMap).toHaveLength(1)
    expect(new URL(requests.openFreeMap[0]).pathname).toBe('/styles/liberty')

    const destination = page.getByTestId('map-destination-search')
    await destination.fill('SM')
    await expect(page.getByTestId('map-local-place-results')).toBeVisible()
    await page.getByTestId('map-local-place-results').locator('button').first().click()
    await expect(page.getByTestId('map-place-detail-sheet')).toContainText(
      /SM Entertainment|SM 娱乐/,
    )
    await page.getByTestId('map-place-use-destination').click()

    await page.getByTestId('map-add-place').click()
    const creator = page.getByTestId('map-place-creator')
    await creator.getByTestId('map-place-name').fill('Relay studio')
    await creator.getByTestId('map-place-detail').fill('Seongdong rehearsal building 3F')
    await creator.getByRole('button', { name: /Work|工作/ }).click()
    await creator.getByTestId('map-choose-pin').click()
    await expect(page.getByTestId('map-placement-mode')).toBeVisible()
    await clickMapLibreCanvas(mapCanvas, 0.72, 0.43)
    await expect(page.getByTestId('map-pending-pin-status')).toBeVisible()
    await page.getByTestId('map-save-address').click()
    await expect(page.getByTestId('map-place-detail-sheet')).toContainText('Relay studio')
    await page
      .getByTestId('map-place-detail-sheet')
      .getByRole('button', { name: /Close|关闭/ })
      .click()
    await renderer.locator('.openfreemap-marker-button[title="Relay studio"]').click()
    await expect(page.getByTestId('map-place-detail-sheet')).toContainText(
      'Seongdong rehearsal building 3F',
    )

    await page
      .getByTestId('map-place-detail-sheet')
      .getByRole('button', { name: /Close|关闭/ })
      .click()
    await page.getByTestId('map-open-settings').click()
    await expect(page.getByTestId('map-real-basemap-source')).toContainText('OpenFreeMap')
    await expect(page.getByTestId('map-open-import')).toBeVisible()
    await expect(page.getByTestId('map-open-generate')).toBeVisible()
    await expect(page.getByTestId('map-open-visual-settings')).toBeVisible()

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    expect(overflow).toBeLessThanOrEqual(1)
  })

  test('keeps a fictional world entirely local with no OpenFreeMap or MapLibre request', async ({
    page,
  }) => {
    const requests = trackMapRuntimeRequests(page)
    await unlockToHome(page)
    await navigateInsideUnlockedApp(page, '/worldbook')
    await page.getByTestId('worldbook-panel-tab-pack').click()
    await page.getByTestId('worldbook-current-pack-select').selectOption('survival_city')
    await page.getByTestId('worldbook-current-pack-activate').click()

    await navigateInsideUnlockedApp(page, '/map')
    const mapCanvas = page.getByTestId('map-primary-canvas')
    await expect(
      mapCanvas.locator('[data-map-pack="cyber-wasteland-v1"][data-renderer="local-pack"]'),
    ).toBeVisible()
    await expect(mapCanvas.locator('.leaflet-image-layer')).toBeVisible()
    await expect(mapCanvas.locator('.map-scene-faction-label')).toHaveCount(4)

    await page.getByTestId('map-destination-search').fill('Ash')
    await page.getByTestId('map-local-place-results').locator('button').first().click()
    await expect(page.getByTestId('map-place-detail-sheet')).toContainText(
      /Ash Market|灰烬集市/,
    )
    expect(requests.openFreeMap).toEqual([])
    expect(requests.maplibreModules).toEqual([])
  })

  test('keeps an imported custom map local with no OpenFreeMap or MapLibre request', async ({
    page,
  }) => {
    const requests = trackMapRuntimeRequests(page)
    await unlockToHome(page)
    await navigateInsideUnlockedApp(page, '/map/settings')

    await page.getByTestId('map-open-import').click()
    const dialog = page.getByTestId('map-import-dialog')
    await dialog.locator('input[type="file"]').setInputFiles(CUSTOM_MAP_FIXTURE)
    await dialog.getByTestId('map-import-name').fill('Test story district')
    await dialog.getByTestId('map-import-confirm').click()
    await expect(dialog).toHaveCount(0)
    await expect(page.getByTestId('map-current-source')).toContainText('Test story district')

    await navigateInsideUnlockedApp(page, '/map')
    const mapCanvas = page.getByTestId('map-primary-canvas')
    await expect(mapCanvas.locator('[data-renderer="local-pack"]')).toBeVisible()
    await expect(mapCanvas.locator('.leaflet-image-layer')).toBeVisible()
    expect(requests.openFreeMap).toEqual([])
    expect(requests.maplibreModules).toEqual([])
  })

  test('falls back locally when OpenFreeMap startup fails and keeps placement interactive', async ({
    page,
  }) => {
    const requests = trackMapRuntimeRequests(page)
    await page.route(`https://${OPENFREEMAP_HOST}/**`, (route) =>
      route.abort('internetdisconnected'),
    )
    await unlockToHome(page)
    await navigateInsideUnlockedApp(page, '/map')

    const mapCanvas = page.getByTestId('map-primary-canvas')
    await expect(mapCanvas.locator('[data-renderer="local-fallback"]')).toBeVisible({
      timeout: 15000,
    })
    await expect(mapCanvas.locator('.leaflet-image-layer')).toBeVisible()
    expect(requests.openFreeMap.length).toBeGreaterThan(0)

    await page.getByTestId('map-add-place').click()
    await page.getByTestId('map-place-name').fill('Offline studio')
    await page.getByTestId('map-place-detail').fill('Saved against canonical Seoul coordinates')
    await page.getByTestId('map-choose-pin').click()
    const localCanvas = mapCanvas.getByTestId('map-scene-leaflet')
    const bounds = await localCanvas.boundingBox()
    expect(bounds).toBeTruthy()
    await localCanvas.click({
      force: true,
      position: { x: bounds.width * 0.63, y: bounds.height * 0.47 },
    })
    await expect(page.getByTestId('map-pending-pin-status')).toBeVisible()
    await page.getByTestId('map-save-address').click()
    await expect(page.getByTestId('map-place-detail-sheet')).toContainText('Offline studio')
  })

  test('edits coordinates during an active trip and preserves every parent return chain', async ({
    page,
  }) => {
    await mockOpenFreeMapStyle(page)
    await unlockToHome(page)
    await navigateInsideUnlockedApp(page, '/map?from=home&homePage=1')
    await expect(page.locator('[data-renderer="openfreemap"]')).toBeVisible({ timeout: 15000 })

    await page.getByTestId('map-destination-search').fill('Trip destination')
    await page.getByTestId('map-primary-start-trip').click()
    await expect(page.getByTestId('map-primary-start-trip')).toContainText(/In transit|进行中/)

    await page.getByTestId('map-open-settings').click()
    await expect(page).toHaveURL(/#\/map\/settings\?from=home&homePage=1/)
    await page.getByTestId('map-open-place-settings').click()
    await expect(page).toHaveURL(/#\/map\/settings\/places\?from=home&homePage=1/)

    await page.getByTestId('map-user-pin-1').click()
    await page.getByTestId('map-pin-name').fill('Seoul home')
    await page.getByTestId('map-pin-reselect-coordinate').click()
    await expect(page.getByTestId('map-pin-coordinate-mode')).toBeVisible()
    await clickMapLibreCanvas(page.getByTestId('map-pin-management-canvas'), 0.58, 0.46)
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
})
