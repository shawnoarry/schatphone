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
    await expect(page.getByTestId('map-current-location')).toHaveAttribute(
      'aria-label',
      /Role location|角色位置/,
    )

    const destination = page.getByTestId('map-destination-search')
    await destination.fill('SM')
    await expect(page.getByTestId('map-local-place-results')).toBeVisible()
    await page.getByTestId('map-local-place-results').locator('button').first().click()
    await expect(page.getByTestId('map-place-detail-sheet')).toContainText(
      /SM Entertainment|SM 娱乐/,
    )
    await page.getByTestId('map-place-use-destination').click()

    await page.getByTestId('map-open-places').click()
    await expect(page.getByTestId('map-add-place-drawer')).toBeVisible()
    await expect(page.getByTestId('map-place-category-filter')).toBeVisible()
    await page.getByTestId('map-place-filter-transit').click()
    await expect(page.getByTestId('map-filtered-place-list').locator('.map-place-list-row')).toHaveCount(1)
    await expect(page.getByTestId('map-filtered-place-list')).toContainText(
      /Seoul Station|首尔站/,
    )
    await page.getByTestId('map-place-filter-all').click()
    await expect(page.getByTestId('map-manage-places')).toContainText(
      /Manage places and pins|管理地点与图钉/,
    )
    await page.getByTestId('map-add-place-drawer').click()
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
    await page.getByTestId('map-open-places').click()
    await page.getByTestId('map-manage-places').click()
    await expect(page).toHaveURL(/#\/map\/settings\/places/)
    await page.getByTestId('map-pin-settings-back').click()
    await expect(page).toHaveURL(/#\/map\/settings/)
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
    await expect(page.getByTestId('map-faction-legend')).toHaveCount(0)
    await page.getByTestId('map-faction-legend-toggle').click()
    await expect(page.getByTestId('map-faction-legend')).toBeVisible()

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

    await page.getByTestId('map-open-places').click()
    await page.getByTestId('map-add-place-drawer').click()
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
    await page.getByTestId('map-primary-transport-mode').click()
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
    await expect(page.getByTestId('map-current-location')).toHaveCount(0)
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
    await expect(categoryGuide.locator('[data-testid^="map-pin-category-guide-"]')).toHaveCount(6)
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
          version: 1,
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
    await expect(page.getByTestId('map-current-location')).toHaveCount(0)

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
