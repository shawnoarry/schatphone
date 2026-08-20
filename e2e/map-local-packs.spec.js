import { expect, test } from '@playwright/test'
import { projectUiAssetUrl } from '../src/lib/project-assets.js'
import {
  navigateInsideUnlockedApp,
  unlockToHome,
} from './helpers/navigation'

const OPENFREEMAP_HOST = 'tiles.openfreemap.org'
const CUSTOM_MAP_FIXTURE_URL = projectUiAssetUrl('apps/map/seoul-street-map-v1.webp')
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
    maplibreWorkers: [],
    maplibreShared: [],
  }
  page.on('request', (request) => {
    const url = request.url()
    if (!/^https?:/i.test(url)) return
    const parsed = new URL(url)
    if (parsed.hostname === OPENFREEMAP_HOST) requests.openFreeMap.push(url)
    if (/maplibre-gl-shared\.mjs/i.test(parsed.pathname)) {
      requests.maplibreShared.push(url)
    }
    if (
      /maplibre/i.test(parsed.pathname) &&
      !/maplibre-gl-worker/i.test(parsed.pathname) &&
      !/maplibre-gl-shared/i.test(parsed.pathname)
    ) {
      requests.maplibreModules.push(url)
    }
    if (/maplibre-gl-worker/i.test(parsed.pathname) && !url.includes('?url')) {
      requests.maplibreWorkers.push(url)
    }
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
  test('renders geographic Seoul with MapLibre and creates canonical places', async ({ page }, testInfo) => {
    test.setTimeout(45_000)
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
    expect(requests.maplibreWorkers).toHaveLength(1)
    expect(requests.maplibreShared.length).toBeGreaterThan(0)
    expect(new URL(requests.openFreeMap[0]).pathname).toBe('/styles/liberty')
    await expect(page.getByTestId('map-current-location')).toHaveAttribute(
      'aria-label',
      /Role location|角色位置/,
    )
    await expect(page.getByTestId('map-current-location')).toContainText(
      /Role location|角色位置/,
    )
    await expect(page.getByTestId('map-set-current-location')).toBeVisible()
    await expect(page.getByTestId('map-open-trip')).toContainText(/Journey|行程/)
    await expect(page.getByTestId('map-open-places')).toContainText(/Places|地点/)
    await expect(page.getByTestId('map-open-progress')).toContainText(/Footprints|足迹/)

    const destination = page.getByTestId('map-destination-search')
    await destination.focus()
    const searchPanel = page.getByTestId('map-local-place-results')
    await expect(searchPanel).toBeVisible()
    const searchCategories = page.getByTestId('map-search-categories')
    await expect(searchCategories).toBeVisible()
    await expect(searchPanel.locator('.map-place-result')).toHaveCount(106)
    await expect(page.getByTestId('map-local-search-scope')).toContainText('106/109')
    await expect(searchPanel).not.toContainText(/CU BGF|GS25|7-Eleven/)
    const searchCategoryOrder = await searchCategories.locator('button').evaluateAll((buttons) =>
      buttons.slice(0, 8).map((button) => button.getAttribute('data-testid')),
    )
    expect(searchCategoryOrder).toEqual([
      'map-search-category-all',
      'map-search-category-transit',
      'map-search-category-residence',
      'map-search-category-work',
      'map-search-category-education',
      'map-search-category-shopping',
      'map-search-category-supermarket',
      'map-search-category-convenience_store',
    ])
    const searchCategoryOverflow = await searchCategories.evaluate(
      (element) => element.scrollWidth - element.clientWidth,
    )
    expect(searchCategoryOverflow).toBeLessThanOrEqual(1)

    await clickMapLibreCanvas(mapCanvas, 0.006, 0.5)
    await expect(searchPanel).toHaveCount(0)

    await page.getByTestId('map-open-trip').click()
    const tripFromPicker = page.getByTestId('map-trip-from-picker')
    const rolePositionOption = await tripFromPicker.evaluate((element) => {
      const option = Array.from(element.options).find((item) =>
        item.textContent.includes('角色位置') || item.textContent.includes('Role position'),
      )
      return option ? { label: option.textContent, value: option.value } : null
    })
    expect(rolePositionOption).toMatchObject({
      value: '首尔市江南区清潭洞 88-1',
    })
    expect(rolePositionOption.label).toMatch(/角色位置|Role position/)
    await tripFromPicker.selectOption({ label: '江南站' })
    await page.getByTestId('map-trip-to-picker').selectOption({ label: '三星城' })
    await expect(page.getByTestId('map-trip-estimate')).toContainText('0.3 km')
    await page
      .getByTestId('map-secondary-drawer')
      .getByRole('button', { name: /Close|关闭/ })
      .click()
    await destination.fill('')
    await destination.press('Escape')
    await expect(searchPanel).toHaveCount(0)

    await page.getByTestId('map-set-current-location').click()
    await expect(page.getByTestId('map-role-position-mode')).toContainText(
      /Tap any blank map point|点击地图任意空白位置/,
    )
    await clickMapLibreCanvas(mapCanvas, 0.54, 0.58)
    await expect(page.getByTestId('map-role-position-feedback')).toContainText(
      /Role position updated|角色位置已更新/,
    )
    await expect(
      renderer.locator(
        '.openfreemap-marker-button[title="角色位置"], .openfreemap-marker-button[title="Role position"]',
      ),
    ).toHaveCount(1)

    await destination.focus()
    await expect(searchPanel).toBeVisible()

    const lastBrowseResult = searchPanel.locator('.map-place-result').last()
    await lastBrowseResult.scrollIntoViewIfNeeded()
    await lastBrowseResult.click()
    await expect(page.getByTestId('map-place-detail-sheet')).toBeVisible()
    await page
      .getByTestId('map-place-detail-sheet')
      .getByRole('button', { name: /Close|关闭/ })
      .click()
    await destination.focus()
    await expect(searchPanel).toBeVisible()

    await page.getByTestId('map-search-category-convenience_store').click()
    await expect(searchPanel.locator('.map-place-result')).toHaveCount(3)
    await expect(searchPanel).toContainText(/CU BGF|GS25|7-Eleven/)
    await page.getByTestId('map-search-category-all').click()

    await page.getByTestId('map-search-category-leisure').click()
    await expect(searchPanel.locator('.map-place-result')).not.toHaveCount(0)
    await expect(searchPanel).toContainText(/CGV|Megabox|Lotte Cinema|乐天影院/)
    await page.getByTestId('map-search-category-all').click()

    await page.getByTestId('map-search-category-shopping').click()
    await expect(page.getByTestId('map-search-category-shopping')).toHaveAttribute('aria-pressed', 'true')
    await expect(searchPanel).toContainText(/Jenny House|Soonsoo|A by BOM/)
    await page.getByTestId('map-search-category-all').click()

    await destination.fill('江南 美容')
    await expect(searchPanel).toContainText('Jenny House')
    await expect(searchPanel).not.toContainText('Starship')
    await expect(searchPanel).toContainText(/Alias: 美容室|别名：美容室/)

    await destination.fill('Hongde')
    await expect(searchPanel).toContainText(/Hongik University Street|弘大入口/)
    await expect(searchPanel).toContainText(/Close spelling|拼写接近/)

    await destination.fill('North river rendezvous')
    await expect(page.getByTestId('map-use-freeform-destination')).toBeVisible()
    await expect(page.getByTestId('map-search-browse-places')).toBeVisible()
    await expect(page.getByTestId('map-primary-route-card')).toHaveCount(0)
    await page.getByTestId('map-use-freeform-destination').click()
    await expect(searchPanel).toHaveCount(0)
    await expect(page.getByTestId('map-primary-route-card')).toContainText(
      'North river rendezvous',
    )

    const searchOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    expect(searchOverflow).toBeLessThanOrEqual(1)

    await destination.fill('SM')
    await expect(searchPanel).toBeVisible()
    await expect(page.getByTestId('map-primary-route-card')).toHaveCount(0)
    await searchPanel.locator('.map-place-result').first().click()
    await expect(page.getByTestId('map-place-detail-sheet')).toContainText(
      /SM Entertainment|SM 娱乐/,
    )
    await expect(page.getByTestId('map-primary-route-card')).toHaveCount(0)
    await page.getByTestId('map-place-use-destination').click()
    await expect(page.getByTestId('map-primary-route-card')).toBeVisible()

    await page.getByTestId('map-open-places').click()
    await expect(page.locator('.map-drawer-tab')).toHaveCount(0)
    await expect(page.getByTestId('map-add-place-drawer')).toHaveCount(0)
    const drawerCategories = page.getByTestId('map-place-category-filter')
    await expect(drawerCategories).toBeVisible()
    const drawerCategoryOverflow = await drawerCategories.evaluate(
      (element) => element.scrollWidth - element.clientWidth,
    )
    expect(drawerCategoryOverflow).toBeLessThanOrEqual(1)
    const drawerCategoryOrder = await drawerCategories.locator('.map-place-category-control').evaluateAll(
      (controls) => controls.slice(0, 8).map((control) =>
        control.querySelector('[data-testid]')?.getAttribute('data-testid'),
      ),
    )
    expect(drawerCategoryOrder).toEqual([
      'map-place-filter-all',
      'map-place-filter-transit',
      'map-place-filter-residence',
      'map-place-filter-work',
      'map-place-filter-education',
      'map-place-filter-shopping',
      'map-place-filter-supermarket',
      'map-place-filter-convenience_store',
    ])
    await page.getByTestId('map-place-filter-transit').click()
    await expect(page.getByTestId('map-filtered-place-list').locator('.map-place-list-row')).toHaveCount(7)
    await expect(page.getByTestId('map-filtered-place-list')).toContainText(
      /Incheon International Airport|仁川国际机场/,
    )
    await page.getByTestId('map-place-filter-convenience_store').click()
    await expect(page.getByTestId('map-filtered-place-list').locator('.map-place-list-row')).toHaveCount(3)
    await expect(renderer.locator('.openfreemap-marker-button[title="CU BGF 总部店"]')).toHaveCount(0)
    await page.getByTestId('map-place-category-visibility-convenience_store').click()
    await expect(renderer.locator('.openfreemap-marker-button[title="CU BGF 总部店"]')).toHaveCount(1)
    await page.getByTestId('map-place-visibility-seoul-cu-bgf-hq').click()
    await expect(renderer.locator('.openfreemap-marker-button[title="CU BGF 总部店"]')).toHaveCount(0)

    await page.getByTestId('map-place-filter-city_services').click()
    await expect(page.getByTestId('map-filtered-place-list').locator('.map-place-list-row')).toHaveCount(8)
    await expect(page.getByTestId('map-filtered-place-list')).toContainText(/警察|消防|Police|Fire/)

    await page.getByTestId('map-place-filter-transit').click()
    await expect(page.getByTestId('map-filtered-place-list').locator('.map-place-list-row')).toHaveCount(7)
    await expect(page.getByTestId('map-filtered-place-list')).toContainText(
      /Seoul Station|首尔站/,
    )
    await page.getByTestId('map-place-filter-all').click()
    await expect(page.getByTestId('map-manage-places')).toContainText(
      /Create or manage places and pins|新增或管理地点与图钉/,
    )
    await page.getByTestId('map-manage-places').click()
    await expect(page).toHaveURL(/#\/map\/settings\/places/)
    await expect(page.getByTestId('map-pin-management-filter')).toBeVisible()
    const settingsCategories = page.getByTestId('map-pin-management-categories')
    const settingsCategoryOverflow = await settingsCategories.evaluate(
      (element) => element.scrollWidth - element.clientWidth,
    )
    expect(settingsCategoryOverflow).toBeLessThanOrEqual(1)
    const settingsCategoryOrder = await settingsCategories.locator('button').evaluateAll((buttons) =>
      buttons.slice(0, 8).map((button) => button.getAttribute('data-testid')),
    )
    expect(settingsCategoryOrder).toEqual([
      'map-pin-management-category-all',
      'map-pin-management-category-transit',
      'map-pin-management-category-residence',
      'map-pin-management-category-work',
      'map-pin-management-category-education',
      'map-pin-management-category-shopping',
      'map-pin-management-category-supermarket',
      'map-pin-management-category-convenience_store',
    ])
    await page.getByTestId('map-pin-management-search').fill('HYBE')
    await expect(page.getByTestId('map-world-pin-list')).toContainText('HYBE')
    await expect(page.getByTestId('map-world-pin-list')).not.toContainText(/SM Entertainment|SM 娱乐/)
    await page.getByTestId('map-pin-management-search').fill('')

    await page.getByTestId('map-pin-create').click()
    const creator = page.getByTestId('map-pin-editor')
    await expect(creator.locator('[data-testid^="map-pin-icon-group-"]')).toHaveCount(14)
    await expect(creator.locator('[data-testid^="map-pin-icon-type-"]')).toHaveCount(31)
    await creator.getByTestId('map-pin-name').fill('Skyline residence')
    await creator.getByTestId('map-pin-detail').fill('Seongdong residential tower')
    await creator.getByTestId('map-pin-icon-type-residence_luxury').click()
    await expect(creator.getByTestId('map-pin-selected-type')).toContainText(
      /Residence.*Luxury residences|住宅.*豪华住宅/,
    )
    await testInfo.attach('map-pin-icon-picker', {
      body: await creator.screenshot(),
      contentType: 'image/png',
    })
    await creator.getByTestId('map-pin-reselect-coordinate').click()
    await expect(page.getByTestId('map-pin-coordinate-mode')).toBeVisible()
    await clickMapLibreCanvas(page.getByTestId('map-pin-management-canvas'), 0.72, 0.43)
    await expect(creator).toBeVisible()
    await creator.getByTestId('map-pin-save').click()
    await expect(page.getByTestId('map-user-pin-list')).toContainText('Skyline residence')
    await page.getByTestId('map-user-pin-list').getByText('Skyline residence').click()
    await expect(page.getByTestId('map-pin-icon-type-residence_luxury')).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    await page
      .getByTestId('map-pin-editor')
      .getByRole('button', { name: /Close|关闭/ })
      .click()

    await page.getByTestId('map-pin-settings-back').click()
    await expect(page).toHaveURL(/#\/map\/settings/)
    await expect(page.getByTestId('map-real-basemap-source')).toContainText('OpenFreeMap')
    await expect(page.getByTestId('map-open-import')).toBeVisible()
    await expect(page.getByTestId('map-open-generate')).toBeVisible()
    await expect(page.getByTestId('map-open-visual-settings')).toBeVisible()
    await page.getByRole('button', { name: /Back to Map|返回地图/ }).click()
    await expect(page).toHaveURL(/#\/map(?:\?|$)/)

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    expect(overflow).toBeLessThanOrEqual(1)
  })

  test('switches place-name language and keeps the Map preference after refresh', async ({
    page,
  }) => {
    await mockOpenFreeMapStyle(page)
    await unlockToHome(page)
    await navigateInsideUnlockedApp(page, '/map/settings')

    const languageSettings = page.getByTestId('map-place-language-section')
    await expect(languageSettings).toBeVisible()
    await languageSettings.getByTestId('map-place-language-mode-en').click()
    await expect(languageSettings.getByTestId('map-place-language-mode-en')).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    await languageSettings.getByTestId('map-place-language-mode-bilingual').click()
    await expect(languageSettings.getByTestId('map-place-language-mode-bilingual')).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    const settingsOverflow = await languageSettings.evaluate((element) => ({
      document: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      control: element.scrollWidth - element.clientWidth,
    }))
    expect(settingsOverflow.document).toBeLessThanOrEqual(1)
    expect(settingsOverflow.control).toBeLessThanOrEqual(1)

    await navigateInsideUnlockedApp(page, '/map')

    const openYeouidoPark = async () => {
      const destination = page.getByTestId('map-destination-search')
      await destination.fill('Yeouido Hangang Park')
      const results = page.getByTestId('map-local-place-results')
      await expect(results).toBeVisible()
      const parkResult = results.locator('.map-place-result').first()
      await expect(parkResult).toBeVisible()
      await parkResult.click()
      const detail = page.getByTestId('map-place-detail-sheet')
      await expect(detail).toBeVisible()
      return detail
    }

    let detail = await openYeouidoPark()
    await expect(detail.getByTestId('map-place-secondary-name')).toBeVisible()
    const bilingualNames = await Promise.all([
      detail.getByRole('heading', { level: 2 }).textContent(),
      detail.getByTestId('map-place-secondary-name').textContent(),
    ])
    expect(bilingualNames.map((name) => name?.trim())).toContain('Yeouido Hangang Park')
    expect(new Set(bilingualNames.map((name) => name?.trim())).size).toBe(2)

    const overflow = await detail.evaluate((element) => ({
      document: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      detail: element.scrollWidth - element.clientWidth,
    }))
    expect(overflow.document).toBeLessThanOrEqual(1)
    expect(overflow.detail).toBeLessThanOrEqual(1)

    await expect
      .poll(() =>
        page.evaluate(() => {
          const raw = window.localStorage.getItem('schatphone:store:map')
          return raw ? JSON.parse(raw)?.data?.mapPlaceDisplayMode : null
        }),
      )
      .toBe('bilingual')

    await page.reload()
    await unlockToHome(page)
    await navigateInsideUnlockedApp(page, '/map')
    detail = await openYeouidoPark()
    await expect(detail.getByTestId('map-place-secondary-name')).toBeVisible()
    await expect(detail).toContainText('Yeouido Hangang Park')
  })

  test('gates nearby facilities through the per-world Footprints setting', async ({ page }) => {
    await mockOpenFreeMapStyle(page)
    await unlockToHome(page)
    await navigateInsideUnlockedApp(page, '/map/settings')

    const knowledgeSettings = page.getByTestId('map-place-knowledge-settings')
    await expect(knowledgeSettings).toBeVisible()
    await expect(page.getByTestId('map-place-knowledge-all-known')).toHaveAttribute('aria-checked', 'true')
    await page.getByTestId('map-place-knowledge-footprints').click()
    await expect(page.getByTestId('map-place-knowledge-footprints')).toHaveAttribute('aria-checked', 'true')

    await page.getByRole('button', { name: /Back to Map|返回地图/ }).click()
    await expect(page).toHaveURL(/#\/map(?:\?|$)/)
    const destination = page.getByTestId('map-destination-search')
    await destination.fill('CU BGF')
    const searchPanel = page.getByTestId('map-local-place-results')
    await expect(searchPanel).toBeVisible()
    await expect(searchPanel).not.toContainText('CU BGF')
    await destination.press('Escape')
    await expect(searchPanel).toHaveCount(0)

    await page.getByTestId('map-open-progress').click()
    const footprints = page.getByTestId('map-footprints-discovery')
    await expect(footprints).toBeVisible()
    await expect(footprints).toContainText(/0\/6|附近配套|nearby facilities/)

    const viewportOverflow = await page.evaluate(() =>
      document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    expect(viewportOverflow).toBeLessThanOrEqual(1)
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
    await expect(page.getByTestId('map-faction-legend')).toHaveCount(0)
    await page.getByTestId('map-faction-legend-toggle').click()
    await expect(page.getByTestId('map-faction-legend')).toBeVisible()

    const destination = page.getByTestId('map-destination-search')
    const searchPanel = page.getByTestId('map-local-place-results')
    await destination.focus()
    await expect(searchPanel).toBeVisible()
    const localCanvas = mapCanvas.getByTestId('map-scene-leaflet')
    const localBounds = await localCanvas.boundingBox()
    expect(localBounds).toBeTruthy()
    await localCanvas.click({
      force: true,
      position: { x: 5, y: localBounds.height * 0.5 },
    })
    await expect(searchPanel).toHaveCount(0)

    await destination.fill('Ash')
    await searchPanel.locator('.map-place-result').click()
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
    const fixtureResponse = await page.request.get(CUSTOM_MAP_FIXTURE_URL)
    expect(fixtureResponse.ok()).toBe(true)
    await dialog.locator('input[type="file"]').setInputFiles({
      name: 'seoul-street-map-v1.webp',
      mimeType: 'image/webp',
      buffer: await fixtureResponse.body(),
    })
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
    test.setTimeout(55_000)
    const requests = trackMapRuntimeRequests(page)
    await page.route(`https://${OPENFREEMAP_HOST}/**`, (route) =>
      route.abort('internetdisconnected'),
    )
    await unlockToHome(page)
    await navigateInsideUnlockedApp(page, '/map')

    const mapCanvas = page.getByTestId('map-primary-canvas')
    await expect(mapCanvas.locator('[data-renderer="local-fallback"]')).toBeVisible({
      timeout: 40_000,
    })
    await expect(mapCanvas.locator('.leaflet-image-layer')).toBeVisible()
    expect(requests.openFreeMap.length).toBeGreaterThan(0)

    await page.getByTestId('map-open-places').click()
    await expect(page.getByTestId('map-add-place-drawer')).toHaveCount(0)
    await page.getByTestId('map-manage-places').click()
    await page.getByTestId('map-pin-create').click()
    await page.getByTestId('map-pin-name').fill('Offline studio')
    await page.getByTestId('map-pin-detail').fill('Saved against canonical Seoul coordinates')
    await page.getByTestId('map-pin-reselect-coordinate').click()
    const localCanvas = page
      .getByTestId('map-pin-management-canvas')
      .getByTestId('map-scene-leaflet')
    const bounds = await localCanvas.boundingBox()
    expect(bounds).toBeTruthy()
    await localCanvas.click({
      force: true,
      position: { x: bounds.width * 0.63, y: bounds.height * 0.47 },
    })
    await expect(page.getByTestId('map-pin-editor')).toBeVisible()
    await page.getByTestId('map-pin-save').click()
    await expect(page.getByTestId('map-user-pin-list')).toContainText('Offline studio')
    await page.getByTestId('map-pin-settings-back').click()
    await expect(page).toHaveURL(/#\/map\/settings(?:\?|$)/)
    await page.getByRole('button', { name: /Back to Map|返回地图/ }).click()
    await expect(page).toHaveURL(/#\/map(?:\?|$)/)
    await expect(mapCanvas.locator('[data-renderer="local-fallback"]')).toBeVisible({
      timeout: 40_000,
    })
    await mapCanvas.locator('.leaflet-marker-icon[title="Offline studio"]').click()
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
    await page.getByTestId('map-use-freeform-destination').click()
    await page.getByTestId('map-primary-transport-mode').click()
    await expect(page.getByTestId('map-trip-from-picker')).toBeVisible()
    await expect(page.getByTestId('map-trip-to-picker')).toBeVisible()
    const tripPlanningOverflow = await page.evaluate(() => {
      const drawer = document.querySelector('[data-testid="map-secondary-drawer"]')
      return {
        document: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        drawer: drawer instanceof HTMLElement ? drawer.scrollWidth - drawer.clientWidth : 0,
      }
    })
    expect(tripPlanningOverflow.document).toBeLessThanOrEqual(1)
    expect(tripPlanningOverflow.drawer).toBeLessThanOrEqual(1)
    await page.getByTestId('map-transport-mode-hired_vehicle').click()
    await page.getByTestId('map-trip-start').click()
    await expect(page.getByTestId('map-transport-mode-hired_vehicle')).toBeDisabled()
    await expect(page.getByTestId('map-journey-phase')).toContainText(/Departed|已出发/)
    await expect(page.getByTestId('map-journey-steps').locator('li')).toHaveCount(4)
    await expect(page.getByTestId('map-current-location')).toContainText(
      /Start position|出发位置/,
    )
    await expect(page.getByTestId('map-active-journey')).toContainText(/In transit|行程中/)
    await expect(page.getByTestId('map-shared-journey-record')).toHaveCount(0)
    const activeTripOverflow = await page.evaluate(() => {
      const drawer = document.querySelector('[data-testid="map-secondary-drawer"]')
      return {
        document: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        drawer: drawer instanceof HTMLElement ? drawer.scrollWidth - drawer.clientWidth : 0,
      }
    })
    expect(activeTripOverflow.document).toBeLessThanOrEqual(1)
    expect(activeTripOverflow.drawer).toBeLessThanOrEqual(1)
    await page
      .getByTestId('map-secondary-drawer')
      .getByRole('button', { name: /Close|关闭/ })
      .click()
    await expect(page.getByTestId('map-active-journey')).toContainText(/In transit|行程中/)
    await expect(page.getByTestId('map-primary-journey-phase')).toContainText(/Departed|已出发/)
    const lockedRouteTitle = await page
      .getByTestId('map-primary-route-card')
      .locator('.map-route-summary h2')
      .textContent()

    const destinationSearch = page.getByTestId('map-destination-search')
    await destinationSearch.fill('SM')
    await expect(page.getByTestId('map-local-place-results')).toBeVisible()
    await expect(page.getByTestId('map-search-journey-lock')).toContainText(
      /destination is locked|目的地已锁定/,
    )
    await page.getByTestId('map-local-place-results').locator('.map-place-result').first().click()
    await expect(page.getByTestId('map-place-detail-sheet')).toBeVisible()
    await expect(page.getByTestId('map-place-view-journey')).toContainText(
      /View journey|查看行程/,
    )
    await expect(page.getByTestId('map-place-use-destination')).toHaveCount(0)
    await expect(
      page.getByTestId('map-primary-route-card').locator('.map-route-summary h2'),
    ).toHaveText(lockedRouteTitle)
    await page
      .getByTestId('map-place-detail-sheet')
      .getByRole('button', { name: /Close|关闭/ })
      .click()

    await page.getByTestId('map-active-journey').click()
    await expect(page.getByTestId('map-secondary-drawer')).toBeVisible()
    await expect(page.getByTestId('map-journey-phase')).toContainText(/Departed|已出发/)
    await page
      .getByTestId('map-secondary-drawer')
      .getByRole('button', { name: /Close|关闭/ })
      .click()
    const journeyControlOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    expect(journeyControlOverflow).toBeLessThanOrEqual(1)

    await page.getByTestId('map-open-settings').click()
    await expect(page).toHaveURL(/#\/map\/settings\?from=home&homePage=1/)
    await page.getByTestId('map-open-place-settings').click()
    await expect(page).toHaveURL(/#\/map\/settings\/places\?from=home&homePage=1/)

    await page.getByTestId('map-pin-category-guide-trigger').click()
    const categoryGuide = page.getByTestId('map-pin-category-guide')
    await expect(categoryGuide).toBeVisible()
    await expect(categoryGuide.locator('[data-testid^="map-pin-category-guide-group-"]')).toHaveCount(14)
    await expect(categoryGuide.locator('[data-testid^="map-pin-category-guide-icon-"]')).toHaveCount(31)
    await page
      .getByTestId('map-pin-category-guide')
      .getByRole('button', { name: /Close|关闭/ })
      .click()

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

  test('reviews a persisted checkpoint event inline and returns to the active journey', async ({
    page,
  }) => {
    await mockOpenFreeMapStyle(page)
    const seededAt = Date.now()
    await page.addInitScript(({ now }) => {
      const journeyId = 'map_journey_e2e_event'
      const proposalId = `map_journey_event_${journeyId}_en_route`
      window.localStorage.setItem(
        'schatphone:store:map',
        JSON.stringify({
          version: 2,
          savedAt: now,
          data: {
            activeMapPackId: 'real-seoul-v1',
            tripForm: {
              from: 'Home',
              to: 'Office',
              transportMode: 'public_transit',
            },
            tripState: {
              status: 'traveling',
              journeySchemaVersion: 2,
              journeyId,
              phase: 'paused',
              checkpoints: [
                { id: 'departure', threshold: 0, status: 'completed', reachedAt: now - 241000 },
                { id: 'en_route', threshold: 0.4, status: 'completed', reachedAt: now - 1000 },
                { id: 'near_arrival', threshold: 0.8, status: 'pending', reachedAt: 0 },
                { id: 'arrival', threshold: 1, status: 'pending', reachedAt: 0 },
              ],
              eventCheckpointIds: ['en_route'],
              activeInterruption: {
                proposalId,
                eventId: 'map.journey.route_condition.v1',
                journeyId,
                checkpointId: 'en_route',
                requestedAt: now - 1000,
              },
              eventDelaySeconds: 0,
              from: 'Home',
              to: 'Office',
              fromLabel: 'Home',
              toLabel: 'Office',
              transportMode: 'public_transit',
              estimateVersion: 1,
              distanceKm: 4.2,
              fare: 1900,
              durationSeconds: 600,
              startedAt: now - 241000,
              etaAt: now + 359000,
              arrivedAt: 0,
              pausedAt: now - 1000,
              remainingSecondsAtPause: 360,
              totalPausedSeconds: 0,
              pushScheduleRevision: 1,
              scheduledPushId: '',
            },
            tripHistory: [],
          },
        }),
      )
      window.localStorage.setItem(
        'schatphone:store:simulation',
        JSON.stringify({
          version: 2,
          savedAt: now,
          data: {
            eventLogs: [
              {
                id: 'simulation_event_e2e_map',
                eventId: 'map.journey.route_condition.v1',
                moduleKey: 'map',
                targetId: journeyId,
                adapterKey: 'map.journey.propose_interruption',
                triggerSource: 'random',
                status: 'triggered',
                reason: 'eligible_random_passed',
                variantId: 'map.journey.route_condition.daily.brief_slowdown.v1',
                variantPackId: 'map_journey_variant_pack_world_context_daily_global',
                worldContextId: 'world_context_daily_global',
                activeWorldBookIds: [],
                at: now - 1000,
              },
            ],
            eventInstances: [],
            cooldownsByEvent: {},
            dailyCounters: {},
            mapJourneyEventProposals: [
              {
                id: proposalId,
                schemaVersion: 1,
                eventId: 'map.journey.route_condition.v1',
                moduleKey: 'map',
                status: 'pending_review',
                journeyId,
                checkpointId: 'en_route',
                titleZh: '前方通行稍缓',
                titleEn: 'Brief slowdown ahead',
                summaryZh: '途中出现短暂拥堵，你可以直接继续，或留出两分钟缓冲。',
                summaryEn: 'A brief slowdown is forming. Continue now or leave a two-minute buffer.',
                detailZh: '这是本地行程事件估计，不代表实时路况或导航信息。',
                detailEn: 'This is a local journey event estimate, not live traffic or navigation data.',
                allowedOutcomes: ['continue', 'delay'],
                delaySeconds: 120,
                source: {
                  journeyId,
                  journeySchemaVersion: 2,
                  checkpointId: 'en_route',
                  checkpointReachedAt: now - 1000,
                  mapPackId: 'real-seoul-v1',
                  worldPackId: 'default_world',
                  fromLabel: 'Home',
                  toLabel: 'Office',
                  transportMode: 'public_transit',
                },
                provenance: {
                  runtimeLogId: 'simulation_event_e2e_map',
                  triggerSource: 'random',
                  variantId: 'map.journey.route_condition.daily.brief_slowdown.v1',
                  variantPackId: 'map_journey_variant_pack_world_context_daily_global',
                  worldContextId: 'world_context_daily_global',
                  activeWorldBookIds: [],
                },
                createdAt: now - 1000,
              },
            ],
            settings: {
              surpriseMode: 'high',
              enabledModules: { map: true },
              foregroundSessionTickEnabled: false,
              foregroundSessionTickIntervalMs: 600000,
              eventTextMode: 'local_only',
            },
          },
        }),
      )
    }, { now: seededAt })

    await unlockToHome(page)
    await navigateInsideUnlockedApp(page, '/map')

    const primaryEventNotice = page.getByTestId('map-primary-journey-event')
    await expect(primaryEventNotice).toBeVisible()
    await expect(primaryEventNotice).toContainText(/Journey continues|行程仍在继续/)
    await expect(page.getByTestId('map-secondary-drawer')).toHaveCount(0)
    await expect(page.getByTestId('map-active-journey')).toContainText(
      /View route update|查看途中情况/,
    )

    await primaryEventNotice.click()
    const eventCard = page.getByTestId('map-journey-event-card')
    await expect(eventCard).toBeVisible()
    await expect(eventCard).toContainText(/Route update|途中情况/)
    await expect(eventCard).toContainText(/Journey continues|行程仍在继续/)
    await expect(page.getByTestId('map-journey-phase')).toContainText(/En route|途中/)
    await expect(page.getByTestId('map-active-journey')).toContainText(
      /In transit|行程中/,
    )
    await expect(page.getByTestId('map-current-location')).toContainText(
      /Start position|出发位置/,
    )

    const overflowBefore = await page.evaluate(() => {
      const drawer = document.querySelector('[data-testid="map-secondary-drawer"]')
      return {
        document: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        drawer: drawer instanceof HTMLElement ? drawer.scrollWidth - drawer.clientWidth : 0,
      }
    })
    expect(overflowBefore.document).toBeLessThanOrEqual(1)
    expect(overflowBefore.drawer).toBeLessThanOrEqual(1)

    await page.getByTestId('map-journey-event-delay').click()
    await expect(eventCard).toHaveCount(0)
    await expect(page.getByTestId('map-journey-phase')).toContainText(/En route|途中/)
    await expect(page.getByTestId('map-active-journey')).toContainText(/In transit|行程中/)
    await expect(page.getByText(/ETA was extended by two minutes|预计到达时间已增加两分钟/)).toBeVisible()

    const overflowAfter = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    expect(overflowAfter).toBeLessThanOrEqual(1)
  })
})
