import { expect, test } from '@playwright/test'
import {
  navigateInsideUnlockedApp,
  unlockToHome,
  waitForAppRouteReady,
} from './helpers/navigation.js'

const providerId = 'music_provider_e2e'
const deviceSecret = 'music-device-only-secret'
const silentWav =
  'data:audio/wav;base64,UklGRsQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YaAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'
const silentWavBuffer = Buffer.from(silentWav.split(',')[1], 'base64')

const seedMusicState = async (page, theme = 'default') => {
  await page.addInitScript(
    ({ profileId, secret, audioUrl, activeTheme }) => {
      const now = Date.now()
      const coverUrl = `${window.location.origin}/schatphone/icons/pwa-icon-512.png`
      window.localStorage.setItem(
        'schatphone:store:system',
        JSON.stringify({
          version: 1,
          savedAt: now,
          data: {
            settings: {
              appearance: {
                currentTheme: activeTheme,
                homeDesktopSetupVersion: 5,
              },
              system: { language: 'en-US' },
              music: {
                version: 1,
                activeProfileId: profileId,
                profiles: [
                  {
                    id: profileId,
                    name: 'E2E Music Source',
                    enabled: true,
                    baseUrl: 'https://music.example.test/',
                    searchPath: '/search',
                    method: 'GET',
                    queryParam: 'q',
                    limitParam: 'limit',
                    resultPath: 'data.tracks',
                    authMode: 'bearer',
                  },
                ],
                savedTracks: [
                  {
                    id: 'fixture_silence',
                    title: 'Silent Fixture',
                    artist: 'Local Playback',
                    album: 'Browser Sessions',
                    coverUrl,
                    audioUrl,
                    durationSec: 1,
                    providerId: 'local_fixture',
                    providerName: 'Local Fixture',
                    year: 2026,
                    genre: 'Test Tone',
                  },
                ],
                favoriteTrackIds: [],
                recentTracks: [],
                playlists: [],
                queue: [],
                lastPlayedTrackId: 'fixture_silence',
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
      window.localStorage.setItem(
        'schatphone:music:credentials',
        JSON.stringify({
          version: 1,
          data: { [profileId]: { apiKey: secret } },
        }),
      )
    },
    { profileId: providerId, secret: deviceSecret, audioUrl: silentWav, activeTheme: theme },
  )
}

const seedChkszState = async (page) => {
  await page.addInitScript(
    ({ profileId, secret }) => {
      const now = Date.now()
      window.localStorage.setItem(
        'schatphone:store:system',
        JSON.stringify({
          version: 1,
          savedAt: now,
          data: {
            settings: {
              appearance: { currentTheme: 'default', homeDesktopSetupVersion: 5 },
              system: { language: 'en-US' },
              music: {
                version: 2,
                activeProfileId: profileId,
                profiles: [{
                  id: profileId,
                  name: 'ChKSz Music',
                  enabled: true,
                  adapterKind: 'chksz',
                  platform: 'netease',
                  quality: 'jymaster',
                  baseUrl: 'https://api.chksz.com',
                }],
                savedTracks: [],
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
      window.localStorage.setItem(
        'schatphone:music:credentials',
        JSON.stringify({ version: 1, data: { [profileId]: { apiKey: secret } } }),
      )
    },
    { profileId: 'music_provider_chksz_e2e', secret: 'chksz_e2e_device_key' },
  )
}

const expectNoOverflow = async (page) => {
  const overflow = await page.evaluate(() => {
    const music = document.querySelector('.music-app')
    const settings = document.querySelector('.music-settings-sheet')
    return {
      document: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      body: document.body.scrollWidth - document.body.clientWidth,
      music: music instanceof HTMLElement ? music.scrollWidth - music.clientWidth : 0,
      settings: settings instanceof HTMLElement ? settings.scrollWidth - settings.clientWidth : 0,
    }
  })
  expect(overflow.document).toBeLessThanOrEqual(1)
  expect(overflow.body).toBeLessThanOrEqual(1)
  expect(overflow.music).toBeLessThanOrEqual(1)
  expect(overflow.settings).toBeLessThanOrEqual(1)
}

test('Music completes Home, playback, source settings, and shell continuity flows', async ({
  page,
}, testInfo) => {
  const pageErrors = []
  page.on('pageerror', (error) => pageErrors.push(error.message))
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await seedMusicState(page)
  await unlockToHome(page)

  await page.getByTestId('home-page-dot-1').click()
  const musicTile = page.locator('[data-home-tile-id="app_music"]')
  await expect(musicTile).toBeVisible()
  await musicTile.locator('.home-app-tile').click()
  await waitForAppRouteReady(page, '/music')

  await expect(page.getByTestId('music-feature')).toContainText('Browser Sessions')
  await expect(page.getByTestId('music-player')).toContainText('Silent Fixture')
  await expect(page.locator('input[type="password"]')).toHaveCount(0)
  await expectNoOverflow(page)

  await testInfo.attach(`music-listen-${testInfo.project.name}.png`, {
    body: await page.screenshot({ animations: 'disabled' }),
    contentType: 'image/png',
  })

  await page.getByTestId('music-tab-search').click()
  await page.getByTestId('music-search-input').fill('Silent Fixture')
  await page.getByTestId('music-search-input').press('Enter')
  await expect(page.locator('.is-search-results')).toContainText('Silent Fixture')

  await page.getByTestId('music-settings-button').click()
  await expect(page.getByTestId('music-settings')).toBeVisible()
  await expect(page.getByTestId('music-provider-url')).toHaveValue('https://music.example.test/')
  await expect(page.getByTestId('music-provider-key')).toHaveValue(deviceSecret)
  await expect(page.locator('body')).not.toContainText(deviceSecret)
  await expectNoOverflow(page)

  await testInfo.attach(`music-settings-${testInfo.project.name}.png`, {
    body: await page.screenshot({ animations: 'disabled' }),
    contentType: 'image/png',
  })

  await page.getByTestId('music-settings').getByRole('button', { name: 'Close' }).click()
  await page.getByTestId('music-tab-listen').click()
  await page.getByTestId('music-feature-play').click()
  await expect(page.getByTestId('music-player')).toContainText('Silent Fixture')

  await page.getByTestId('music-now-playing-open').click()
  await expect(page.getByTestId('music-now-playing-sheet')).toBeVisible()
  await expectNoOverflow(page)
  await testInfo.attach(`music-now-playing-${testInfo.project.name}.png`, {
    body: await page.screenshot({ animations: 'disabled' }),
    contentType: 'image/png',
  })
  await page.getByTestId('music-now-playing-sheet').getByRole('button', { name: 'Close' }).click()

  await page.locator('.music-topbar-actions button[title="Queue"]').click()
  await expect(page.getByTestId('music-queue')).toContainText('Silent Fixture')
  await page.getByTestId('music-queue').getByRole('button', { name: 'Close' }).click()

  await navigateInsideUnlockedApp(page, '/home')
  await expect(page.getByTestId('music-mini-player')).toContainText('Silent Fixture')
  const homeBottomLayout = await page.evaluate(() => {
    const mini = document.querySelector('[data-testid="music-mini-player"]')?.getBoundingClientRect()
    const dock = document.querySelector('.home-dock')?.getBoundingClientRect()
    return mini && dock ? { miniBottom: mini.bottom, dockTop: dock.top } : null
  })
  expect(homeBottomLayout).not.toBeNull()
  expect(homeBottomLayout.miniBottom).toBeLessThanOrEqual(homeBottomLayout.dockTop - 4)
  await testInfo.attach(`music-mini-home-${testInfo.project.name}.png`, {
    body: await page.screenshot({ animations: 'disabled' }),
    contentType: 'image/png',
  })
  await navigateInsideUnlockedApp(page, '/app-store')
  await expect(page.getByTestId('music-mini-player')).toBeVisible()
  await page.getByTestId('app-store-search').fill('Music')
  await expect(page.getByTestId('app-store-item-app_music')).toContainText('Music')

  await page.getByTestId('music-mini-player').locator('.music-mini-track').click()
  await waitForAppRouteReady(page, '/music')
  await expect(page.getByTestId('music-mini-player')).toHaveCount(0)
  expect(pageErrors).toEqual([])
})

test('Music retains its installed-app composition under the zen system theme', async ({
  page,
}, testInfo) => {
  const pageErrors = []
  page.on('pageerror', (error) => pageErrors.push(error.message))
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await seedMusicState(page, 'zen')
  await unlockToHome(page)
  await navigateInsideUnlockedApp(page, '/music')

  await expect(page.locator('.app-shell[data-theme="zen"]')).toBeVisible()
  await expect(page.getByTestId('music-feature')).toContainText('Browser Sessions')
  await expectNoOverflow(page)
  await page.getByTestId('music-settings-button').click()
  await expect(page.getByTestId('music-settings')).toBeVisible()
  await expectNoOverflow(page)

  await testInfo.attach(`music-zen-${testInfo.project.name}.png`, {
    body: await page.screenshot({ animations: 'disabled' }),
    contentType: 'image/png',
  })
  expect(pageErrors).toEqual([])
})

test('Music Settings adds URL songs and device-local audio files', async ({ page }) => {
  const pageErrors = []
  page.on('pageerror', (error) => pageErrors.push(error.message))
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await seedMusicState(page)
  await page.route('https://media.example.test/direct.wav', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'audio/wav',
      body: silentWavBuffer,
    })
  })
  await unlockToHome(page)
  await navigateInsideUnlockedApp(page, '/music')

  await page.getByTestId('music-settings-button').click()
  await page.getByTestId('music-settings-add-entry').click()
  await expect(page.getByTestId('music-add-panel')).toBeVisible()
  await page.getByTestId('music-direct-url').fill('https://media.example.test/direct.wav')
  await page.getByTestId('music-direct-title').fill('Direct URL Song')
  await page.getByTestId('music-direct-add').click()
  await expect(page.getByTestId('music-imported-list')).toContainText('Direct URL Song')

  await page.getByTestId('music-add-files-tab').click()
  await page.getByTestId('music-local-files').setInputFiles({
    name: 'Device Local Song.wav',
    mimeType: 'audio/wav',
    buffer: silentWavBuffer,
  })
  await expect(page.getByTestId('music-imported-list')).toContainText('Device Local Song')

  const localRow = page.locator('.music-imported-row').filter({ hasText: 'Device Local Song' })
  await localRow.getByRole('button', { name: 'Play' }).click()
  await expect(page.getByTestId('music-player')).toContainText('Device Local Song')
  await expectNoOverflow(page)
  expect(pageErrors).toEqual([])
})

test('Music configures and plays Radio Browser live stations without an API key', async ({
  page,
}) => {
  const pageErrors = []
  const requestUrls = []
  page.on('pageerror', (error) => pageErrors.push(error.message))
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await seedMusicState(page)
  await page.route('https://all.api.radio-browser.info/json/stations/search**', async (route) => {
    requestUrls.push(route.request().url())
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          stationuuid: 'radio-browser-bbc-world',
          name: 'BBC World Service',
          country: 'United Kingdom',
          codec: 'MP3',
          favicon: '',
          url_resolved: silentWav,
          tags: 'news,world',
        },
      ]),
    })
  })

  await unlockToHome(page)
  await navigateInsideUnlockedApp(page, '/music')
  await page.getByTestId('music-settings-button').click()
  await page.getByTestId('music-add-radio-browser').click()

  await expect(page.getByTestId('music-radio-browser-form')).toContainText('Global live radio')
  await expect(page.getByTestId('music-radio-browser-no-key')).toContainText(
    'No API key required',
  )
  await expect(page.getByTestId('music-provider-key')).toHaveCount(0)
  await page.getByTestId('music-provider-test').click()
  await expect(page.locator('.music-provider-badge')).toContainText('Connected')
  await page.getByTestId('music-provider-save').click()

  await page.getByTestId('music-tab-search').click()
  await page.getByTestId('music-search-input').fill('BBC')
  await page.getByTestId('music-search-input').press('Enter')
  await expect(page.locator('.is-search-results')).toContainText('BBC World Service')
  await page.locator('.is-search-results .music-track-index').click()
  await expect(page.getByTestId('music-player')).toContainText('BBC World Service')

  const requestUrl = new URL(requestUrls.at(-1))
  expect(requestUrl.searchParams.get('name')).toBe('BBC')
  expect(requestUrl.searchParams.get('hidebroken')).toBe('true')
  expect(requestUrl.searchParams.get('is_https')).toBe('true')
  expect(requestUrl.searchParams.get('codec')).toBe('MP3')
  expect(pageErrors).toEqual([])
})

test('Music searches, resolves, reads lyrics, and imports playlists through ChKSz', async ({
  page,
}) => {
  const pageErrors = []
  const requestUrls = []
  page.on('pageerror', (error) => pageErrors.push(error.message))
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await seedChkszState(page)
  await page.route('https://api.chksz.com/api/**', async (route) => {
    const url = new URL(route.request().url())
    requestUrls.push(url.toString())
    const headers = {
      'Content-Type': 'application/json',
      'Access-Control-Expose-Headers': 'X-RateLimit-Limit, X-Quota-Free-Remaining, X-Quota-Paid-Remaining, Retry-After',
      'X-RateLimit-Limit': '20',
      'X-Quota-Free-Remaining': '36',
      'X-Quota-Paid-Remaining': '8',
    }
    if (url.pathname === '/api/163_search') {
      await route.fulfill({
        status: 200,
        headers,
        body: JSON.stringify({
          result: {
            songs: [{
              id: 2034742057,
              name: 'API Song',
              ar: [{ name: 'Remote Artist' }],
              al: { name: 'Cloud Album' },
              dt: 180000,
            }],
          },
        }),
      })
      return
    }
    if (url.pathname === '/api/163_music') {
      await route.fulfill({
        status: 200,
        headers,
        body: JSON.stringify({ data: { url: silentWav } }),
      })
      return
    }
    if (url.pathname === '/api/163_lyric') {
      await route.fulfill({
        status: 200,
        headers,
        body: JSON.stringify({ lrc: { lyric: '[00:01.00]First lyric line\n[00:05.00]Second lyric line' } }),
      })
      return
    }
    await route.fulfill({
      status: 200,
      headers,
      body: JSON.stringify({
        playlist: {
          name: 'Imported Night List',
          creator: { nickname: 'Remote DJ' },
          tracks: [{ id: 99, name: 'Playlist Song', ar: [{ name: 'List Artist' }], al: { name: 'List Album' } }],
        },
      }),
    })
  })

  await unlockToHome(page)
  await navigateInsideUnlockedApp(page, '/music')
  await page.getByTestId('music-tab-search').click()
  await page.getByTestId('music-search-input').fill('API Song')
  await page.getByTestId('music-search-input').press('Enter')
  await expect(page.locator('.is-search-results')).toContainText('API Song')
  await page.locator('.is-search-results .music-track-index').first().click()
  await expect(page.getByTestId('music-player')).toContainText('API Song')

  await page.getByTestId('music-now-playing-open').click()
  await page.getByTestId('music-lyrics-open').click()
  await expect(page.getByTestId('music-lyrics-sheet')).toContainText('First lyric line')
  await page.getByTestId('music-lyrics-sheet').getByRole('button', { name: 'Close' }).click()
  await page.getByTestId('music-now-playing-sheet').getByRole('button', { name: 'Close' }).click()

  await page.getByTestId('music-tab-library').click()
  await page.getByRole('button', { name: 'Playlists', exact: true }).click()
  await page.getByTestId('music-playlist-import-open').click()
  await page.getByTestId('music-playlist-id').fill('3778678')
  await page.getByTestId('music-playlist-import-submit').click()
  await expect(page.locator('.music-playlist-grid')).toContainText('Imported Night List')

  await page.getByTestId('music-settings-button').click()
  await expect(page.getByTestId('music-settings')).toContainText('36 free today')
  await expect(page.locator('body')).not.toContainText('chksz_e2e_device_key')
  await expectNoOverflow(page)
  expect(requestUrls).toHaveLength(4)
  expect(requestUrls.every((value) => new URL(value).searchParams.get('apikey') === 'chksz_e2e_device_key')).toBe(true)
  expect(pageErrors).toEqual([])
})
