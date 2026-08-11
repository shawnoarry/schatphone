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
      if (!window.localStorage.getItem('schatphone:store:system')) {
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
                  profiles: [
                    {
                      id: profileId,
                      name: 'ChKSz Music',
                      enabled: true,
                      adapterKind: 'chksz',
                      platform: 'netease',
                      quality: 'jymaster',
                      baseUrl: 'https://api.chksz.com',
                    },
                  ],
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
      }
      if (!window.localStorage.getItem('schatphone:music:credentials')) {
        window.localStorage.setItem(
          'schatphone:music:credentials',
          JSON.stringify({ version: 1, data: { [profileId]: { apiKey: secret } } }),
        )
      }
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

const handleReloadPersistenceNotice = async (page) => {
  const recovery = page.getByTestId('persistence-recovery-sheet')
  if (!(await recovery.isVisible())) return

  const status = await page.evaluate(async () => {
    const { getPersistenceRuntimeStatus } =
      await import('/schatphone/src/lib/persistence-runtime-status.js')
    return getPersistenceRuntimeStatus()
  })
  if (status.primaryCause === 'active_writer') {
    await page.getByTestId('persistence-recovery-retry').click()
    await expect(recovery).toBeHidden()
    return
  }

  expect(status, `Unexpected persistence status: ${JSON.stringify(status)}`).toMatchObject({
    primaryCode: 'reconciliation_required',
    affectedKeys: ['store:map'],
  })
  await page.getByTestId('persistence-recovery-collapse').click()
  await expect(recovery).toBeHidden()
}

const waitForOwnerPersistence = async (page, ownerKeys) => {
  await expect
    .poll(async () =>
      page.evaluate(async (keys) => {
        const { readPersistedRawLayers } = await import('/schatphone/src/lib/persistence.js')
        const layers = await Promise.all(keys.map((key) => readPersistedRawLayers(key)))
        return layers.every((owner) => owner.localRaw === owner.mirrorRaw)
      }, ownerKeys),
    )
    .toBe(true)
}

test('Music completes Home, playback, source settings, and shell continuity flows', async ({
  page,
}, testInfo) => {
  const pageErrors = []
  page.on('pageerror', (error) => pageErrors.push(error.message))
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await seedMusicState(page)
  await page.route('https://music.example.test/search**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: { tracks: [] } }),
    })
  })
  await unlockToHome(page)

  await page.getByTestId('home-page-dot-1').click()
  const musicTile = page.locator('[data-home-tile-id="app_music"]')
  await expect(musicTile).toBeVisible()
  await musicTile.locator('.home-app-tile').click()
  await waitForAppRouteReady(page, '/music')

  await expect(page.getByTestId('music-feature')).toContainText("THIS WEEK'S PICK")
  const recommendationTitle = await page.getByTestId('music-feature').locator('h1').innerText()
  const primaryNavigation = page.locator('.music-nav-list .music-nav-item')
  await expect(primaryNavigation).toHaveCount(3)
  await expect(primaryNavigation).toHaveText(['Discover', 'Albums', 'My Music'])
  await expect(page.locator('.music-nav-list [data-testid="music-tab-search"]')).toHaveCount(0)
  await expect(page.locator('.music-topbar [data-testid="music-tab-search"]')).toBeVisible()
  await expect(page.getByTestId('music-player')).toHaveCount(0)
  await expect(page.locator('input[type="password"]')).toHaveCount(0)
  await expectNoOverflow(page)

  if (testInfo.project.name === 'mobile-chrome') {
    const mobileNavigationLayout = await page.evaluate(() => {
      const app = document.querySelector('.music-app')?.getBoundingClientRect()
      const navigation = document.querySelector('.music-sidebar')?.getBoundingClientRect()
      const scroll = document.querySelector('.music-scroll')?.getBoundingClientRect()
      const inactiveLabel = document
        .querySelector('.music-nav-item:not(.is-active) span')
        ?.getBoundingClientRect()
      const homeIndicator = document.querySelector('.home-indicator')?.getBoundingClientRect()
      const inactiveItem = document.querySelector('.music-nav-item:not(.is-active)')
      if (!app || !navigation || !scroll || !inactiveLabel || !inactiveItem) return null
      return {
        appBottom: app.bottom,
        navigationBottom: navigation.bottom,
        navigationHeight: navigation.height,
        scrollBottom: scroll.bottom,
        inactiveColor: window.getComputedStyle(inactiveItem).color,
        inactiveLabelBottom: inactiveLabel.bottom,
        homeIndicatorTop: homeIndicator?.top ?? app.bottom,
      }
    })
    expect(mobileNavigationLayout).not.toBeNull()
    expect(
      Math.abs(mobileNavigationLayout.navigationBottom - mobileNavigationLayout.appBottom),
    ).toBeLessThanOrEqual(1)
    expect(mobileNavigationLayout.navigationHeight).toBeLessThanOrEqual(80)
    expect(mobileNavigationLayout.scrollBottom).toBeLessThanOrEqual(
      mobileNavigationLayout.navigationBottom,
    )
    expect(mobileNavigationLayout.inactiveColor).toBe('rgb(119, 123, 128)')
    expect(mobileNavigationLayout.inactiveLabelBottom).toBeLessThanOrEqual(
      mobileNavigationLayout.homeIndicatorTop - 4,
    )
  }

  await testInfo.attach(`music-listen-${testInfo.project.name}.png`, {
    body: await page.screenshot({ animations: 'disabled' }),
    contentType: 'image/png',
  })

  await page.getByTestId('music-tab-browse').click()
  await expect(page.getByTestId('music-tab-browse')).toHaveClass(/is-active/)
  await expect(page.locator('.music-catalog-hero')).toContainText('THE RECORD SHELF')
  await expect(page.locator('.music-album-grid .music-album-item')).toHaveCount(7)
  await expectNoOverflow(page)
  await testInfo.attach(`music-albums-${testInfo.project.name}.png`, {
    body: await page.screenshot({ animations: 'disabled' }),
    contentType: 'image/png',
  })

  await page.locator('[data-testid^="music-album-open-"]').first().click()
  await expect(page.getByTestId('music-album-detail')).toBeVisible()
  await expect(page.getByTestId('music-album-detail')).toContainText('Track list')
  await expect(page.getByTestId('music-player')).toHaveCount(0)
  if (testInfo.project.name === 'mobile-chrome') {
    await expect(page.locator('.music-sidebar')).toBeHidden()
  }
  await expectNoOverflow(page)
  await testInfo.attach(`music-album-detail-${testInfo.project.name}.png`, {
    body: await page.screenshot({ animations: 'disabled' }),
    contentType: 'image/png',
  })
  await page.getByTestId('music-album-detail-back').click()
  await expect(page.getByTestId('music-album-detail')).toHaveCount(0)
  await expect(page.getByTestId('music-tab-browse')).toHaveClass(/is-active/)

  await page.getByTestId('music-tab-library').click()
  await expect(page.getByTestId('music-tab-library')).toHaveClass(/is-active/)
  await expect(page.locator('.music-library-hero')).toContainText('YOUR MUSIC')
  await expect(page.locator('.music-library-glance button')).toHaveCount(0)
  await expect(page.locator('.music-library-stat')).toHaveCount(3)
  await expect(page.locator('.music-segmented')).toBeVisible()
  await expectNoOverflow(page)
  await testInfo.attach(`music-library-${testInfo.project.name}.png`, {
    body: await page.screenshot({ animations: 'disabled' }),
    contentType: 'image/png',
  })

  await page.getByTestId('music-tab-listen').click()
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
  await expect(page.getByTestId('music-feature-play')).toHaveAttribute('title', 'Pause')
  await expect(page.getByTestId('music-player')).toContainText(recommendationTitle)

  await page.getByTestId('music-now-playing-open').click()
  await expect(page.getByTestId('music-now-playing-sheet')).toBeVisible()
  await expectNoOverflow(page)
  await testInfo.attach(`music-now-playing-${testInfo.project.name}.png`, {
    body: await page.screenshot({ animations: 'disabled' }),
    contentType: 'image/png',
  })
  await page.getByTestId('music-now-playing-sheet').getByRole('button', { name: 'Close' }).click()

  await page.locator('.music-topbar-actions button[title="Queue"]').click()
  await expect(page.getByTestId('music-queue')).toContainText(recommendationTitle)
  await page.getByTestId('music-queue').getByRole('button', { name: 'Close' }).click()

  await navigateInsideUnlockedApp(page, '/home')
  await expect(page.getByTestId('music-mini-player')).toContainText(recommendationTitle)
  const homeBottomLayout = await page.evaluate(() => {
    const mini = document
      .querySelector('[data-testid="music-mini-player"]')
      ?.getBoundingClientRect()
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
  await expect(page.getByTestId('music-feature')).toContainText("THIS WEEK'S PICK")
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

test('Music docks at the Chat edge without blocking controls', async ({ page }, testInfo) => {
  const pageErrors = []
  page.on('pageerror', (error) => pageErrors.push(error.message))
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await seedMusicState(page)
  await unlockToHome(page)
  await navigateInsideUnlockedApp(page, '/music')
  await page.getByTestId('music-feature-play').click()
  await navigateInsideUnlockedApp(page, '/chat/1')

  const player = page.getByTestId('music-mini-player')
  await expect(player).toBeVisible()
  await expect(player).toHaveClass(/is-chat-route/)
  await expect(player).not.toHaveClass(/is-chat-controls-open/)
  await expect(page.getByTestId('music-floating-expand')).toHaveCount(0)
  await expect(player.locator('.music-mini-controls')).toHaveCount(0)
  await expect(player.locator('.music-mini-track')).toHaveAttribute('aria-expanded', 'false')

  const collapsedLayout = await page.evaluate(() => {
    const mini = document
      .querySelector('[data-testid="music-mini-player"]')
      ?.getBoundingClientRect()
    const screen = document.querySelector('.screen')?.getBoundingClientRect()
    const chat = document.querySelector('.chat-shell')
    if (!mini || !screen || !(chat instanceof HTMLElement)) return null
    const interactiveOverlaps = [
      ...chat.querySelectorAll('button, a, input, textarea, select, [tabindex]'),
    ]
      .filter((element) => {
        const rect = element.getBoundingClientRect()
        const style = window.getComputedStyle(element)
        return (
          rect.width > 0 &&
          rect.height > 0 &&
          style.visibility !== 'hidden' &&
          style.display !== 'none'
        )
      })
      .filter((element) => {
        const rect = element.getBoundingClientRect()
        return (
          rect.left < mini.right &&
          rect.right > mini.left &&
          rect.top < mini.bottom &&
          rect.bottom > mini.top
        )
      }).length
    return {
      width: mini.width,
      height: mini.height,
      rightGap: screen.right - mini.right,
      interactiveOverlaps,
      chatPaddingRight: Number.parseFloat(window.getComputedStyle(chat).paddingRight || '0'),
      documentOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    }
  })

  expect(collapsedLayout).not.toBeNull()
  expect(collapsedLayout.width).toBeLessThanOrEqual(45)
  expect(collapsedLayout.height).toBeLessThanOrEqual(50)
  expect(collapsedLayout.rightGap).toBeLessThanOrEqual(1)
  expect(collapsedLayout.interactiveOverlaps).toBe(0)
  expect(collapsedLayout.documentOverflow).toBeLessThanOrEqual(1)
  if (testInfo.project.name === 'chromium') {
    expect(collapsedLayout.chatPaddingRight).toBeGreaterThanOrEqual(44)
  }
  await testInfo.attach(`music-chat-edge-collapsed-${testInfo.project.name}.png`, {
    body: await page.screenshot({ animations: 'disabled' }),
    contentType: 'image/png',
  })

  await player.locator('.music-mini-track').click()
  await expect(player).toHaveClass(/is-chat-controls-open/)
  await expect(player.locator('.music-mini-track')).toHaveAttribute('aria-expanded', 'true')
  await expect(player.locator('.music-mini-controls button')).toHaveCount(3)
  await expect(page.getByTestId('music-chat-collapse')).toBeVisible()
  await expect
    .poll(() => player.evaluate((element) => element.getBoundingClientRect().width))
    .toBeGreaterThan(240)
  const expandedWidth = await player.evaluate((element) => element.getBoundingClientRect().width)
  expect(expandedWidth).toBeLessThanOrEqual(245)
  await testInfo.attach(`music-chat-edge-expanded-${testInfo.project.name}.png`, {
    body: await page.screenshot({ animations: 'disabled' }),
    contentType: 'image/png',
  })

  await page.getByTestId('music-chat-collapse').click()
  await expect(player).not.toHaveClass(/is-chat-controls-open/)
  await expect(player.locator('.music-mini-controls')).toHaveCount(0)
  await expect
    .poll(() => player.evaluate((element) => element.getBoundingClientRect().width))
    .toBeLessThanOrEqual(45)
  const recollapsedWidth = await player.evaluate((element) => element.getBoundingClientRect().width)
  expect(recollapsedWidth).toBeLessThanOrEqual(45)
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
  await expect(page.getByTestId('music-radio-browser-no-key')).toContainText('No API key required')
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
      'Access-Control-Expose-Headers':
        'X-RateLimit-Limit, X-Quota-Free-Remaining, X-Quota-Paid-Remaining, Retry-After',
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
            songs: [
              {
                id: 2034742057,
                name: 'API Song',
                ar: [{ name: 'Remote Artist' }],
                al: { name: 'Cloud Album' },
                dt: 180000,
              },
            ],
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
        body: JSON.stringify({
          lrc: { lyric: '[00:01.00]First lyric line\n[00:05.00]Second lyric line' },
        }),
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
          tracks: [
            {
              id: 99,
              name: 'Playlist Song',
              ar: [{ name: 'List Artist' }],
              al: { name: 'List Album' },
            },
          ],
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
  await page.getByTestId('music-now-playing-favorite').click()
  await expect(page.getByTestId('music-now-playing-favorite')).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await expect(page.getByTestId('music-now-playing-favorite')).toContainText('Added')
  await page.getByTestId('music-lyrics-open').click()
  await expect(page.getByTestId('music-lyrics-sheet')).toContainText('First lyric line')
  await page.getByTestId('music-lyrics-sheet').getByRole('button', { name: 'Close' }).click()
  await page.getByTestId('music-lyrics-open').click()
  await expect(page.getByTestId('music-lyrics-sheet')).toContainText('First lyric line')
  await page.getByTestId('music-lyrics-sheet').getByRole('button', { name: 'Close' }).click()
  await page.getByTestId('music-now-playing-sheet').getByRole('button', { name: 'Close' }).click()

  await page.getByTestId('music-tab-library').click()
  await page.getByRole('button', { name: 'Favorites', exact: true }).click()
  await expect(page.locator('.music-track-list.is-library-list')).toContainText('API Song')
  await page.getByRole('button', { name: 'Playlists', exact: true }).click()
  await page.getByTestId('music-playlist-import-open').click()
  await page.getByTestId('music-playlist-id').fill('3778678')
  await page.getByTestId('music-playlist-import-submit').click()
  await expect(page.locator('.music-playlist-grid')).toContainText('Imported Night List')

  await page.getByTestId('music-settings-button').click()
  await expect(page.getByTestId('music-settings')).toContainText('36 free today')
  await expect(page.locator('body')).not.toContainText('chksz_e2e_device_key')
  await expectNoOverflow(page)

  await waitForOwnerPersistence(page, ['store:system', 'store:map'])
  await page.reload()
  await unlockToHome(page)
  await navigateInsideUnlockedApp(page, '/music')
  await handleReloadPersistenceNotice(page)
  await page.getByTestId('music-tab-library').press('Enter')
  await page.getByRole('button', { name: 'Favorites', exact: true }).click()
  await expect(page.locator('.music-track-list.is-library-list')).toContainText('API Song')
  expect(requestUrls).toHaveLength(4)
  expect(
    requestUrls.every(
      (value) => new URL(value).searchParams.get('apikey') === 'chksz_e2e_device_key',
    ),
  ).toBe(true)
  expect(pageErrors).toEqual([])
})
