import { expect, test } from '@playwright/test'
import {
  navigateInsideUnlockedApp,
  unlockToHome,
  waitForAppRouteReady,
} from './helpers/navigation.js'

const OPENFREEMAP_HOST = 'tiles.openfreemap.org'
const silentWav =
  'data:audio/wav;base64,UklGRsQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YaAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'

const mockOpenFreeMapStyle = async (page) => {
  await page.route(`https://${OPENFREEMAP_HOST}/**`, async (route) => {
    const { pathname } = new URL(route.request().url())
    if (pathname === '/styles/liberty') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          version: 8,
          name: 'Journey media map style',
          sources: {},
          layers: [
            {
              id: 'background',
              type: 'background',
              paint: { 'background-color': '#dbe5df' },
            },
          ],
        }),
      })
      return
    }
    await route.abort('blockedbyclient')
  })
}

const seedJourneyMusic = async (page) => {
  await page.addInitScript((audioUrl) => {
    const now = Date.now()
    window.localStorage.setItem(
      'schatphone:store:system',
      JSON.stringify({
        version: 1,
        savedAt: now,
        data: {
          settings: {
            system: { language: 'en-US' },
            music: {
              version: 2,
              activeProfileId: '',
              profiles: [],
              savedTracks: [
                {
                  id: 'journey_fixture',
                  title: 'Journey Fixture',
                  artist: 'SchatPhone',
                  album: 'Route Sessions',
                  audioUrl,
                  durationSec: 1,
                  providerId: 'journey_fixture_source',
                  providerName: 'Journey Fixture',
                  year: 2026,
                  genre: 'Ambient',
                },
              ],
              favoriteTrackIds: [],
              recentTracks: [],
              playlists: [],
              queue: [],
              lastPlayedTrackId: '',
              playback: { volume: 0.72, muted: false, shuffle: false, repeatMode: 'off' },
              integrationPolicy: {
                chatShareEnabled: true,
                mapNowPlayingEnabled: true,
                externalQueueRequestsEnabled: false,
              },
            },
          },
        },
      }),
    )
  }, silentWav)
}

const expectNoHorizontalOverflow = async (page) => {
  const overflow = await page.evaluate(() => ({
    document: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    body: document.body.scrollWidth - document.body.clientWidth,
  }))
  expect(overflow.document).toBeLessThanOrEqual(1)
  expect(overflow.body).toBeLessThanOrEqual(1)
}

test('keeps Map journey media and the Music floating player as cooperating surfaces', async ({
  page,
}, testInfo) => {
  test.setTimeout(45_000)
  const pageErrors = []
  page.on('pageerror', (error) => pageErrors.push(error.message))
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await mockOpenFreeMapStyle(page)
  await seedJourneyMusic(page)
  await unlockToHome(page)
  await navigateInsideUnlockedApp(page, '/map?from=home&homePage=1')

  await expect(page.getByTestId('map-journey-media-button')).toHaveCount(0)
  await page.getByTestId('map-open-trip').click()
  await page.getByTestId('map-trip-to-input').fill('Evening destination')
  await page.getByTestId('map-transport-mode-walk').click()
  await page.getByTestId('map-trip-start').click()
  await expect(page.getByTestId('map-journey-media-button')).toBeVisible()

  await page
    .getByTestId('map-secondary-drawer')
    .getByRole('button', { name: /Close|关闭/ })
    .click()
  await page.getByTestId('map-journey-media-button').click()
  const journeyPanel = page.getByTestId('map-journey-media-drawer')
  await expect(journeyPanel).toBeVisible()
  await journeyPanel.getByTestId('map-journey-radio-tab').click()
  await expect(journeyPanel.locator('[data-testid^="map-journey-station-"]')).toHaveCount(3)
  const routeMix = journeyPanel.getByTestId('map-journey-station-route_mix')
  await routeMix.click()
  await expect(routeMix).toHaveClass(/is-active/)
  await expect(page.getByTestId('music-mini-player')).toBeVisible()

  const layerOrder = await page.evaluate(() => ({
    mapPanel: Number.parseInt(
      getComputedStyle(document.querySelector('[data-testid="map-journey-media-drawer"]')).zIndex,
      10,
    ),
    floatingPlayer: Number.parseInt(
      getComputedStyle(document.querySelector('[data-testid="music-mini-player"]')).zIndex,
      10,
    ),
  }))
  expect(layerOrder.mapPanel).toBeGreaterThan(layerOrder.floatingPlayer)

  await journeyPanel.getByRole('button', { name: /Close|关闭/ }).click()
  await expect(journeyPanel).toHaveCount(0)
  const floatingPlayer = page.getByTestId('music-mini-player')
  await expect(floatingPlayer).toBeVisible()
  await floatingPlayer.getByTestId('music-floating-expand').click()
  await expect(floatingPlayer.getByTestId('music-floating-content')).toBeVisible()
  await floatingPlayer.getByTestId('music-floating-radio-tab').click()
  await expect(floatingPlayer.getByTestId('music-floating-station-route_mix')).toHaveClass(
    /is-active/,
  )
  await expectNoHorizontalOverflow(page)

  await testInfo.attach(`map-music-floating-${testInfo.project.name}.png`, {
    body: await page.screenshot({ animations: 'disabled' }),
    contentType: 'image/png',
  })

  await floatingPlayer.getByTestId('music-floating-open-app').click()
  await waitForAppRouteReady(page, '/music')
  await expect(page).toHaveURL(/#\/music\?source=map&homePage=1/)
  await page.getByRole('button', { name: /Back to Map|返回地图/ }).first().click()
  await waitForAppRouteReady(page, '/map')
  await expect(page).toHaveURL(/#\/map\?from=home&homePage=1/)
  await expect(page.getByTestId('music-mini-player')).toBeVisible()
  await page.getByTestId('music-floating-close').click()
  await expect(page.getByTestId('music-mini-player')).toHaveCount(0)
  await expectNoHorizontalOverflow(page)
  expect(pageErrors).toEqual([])
})
