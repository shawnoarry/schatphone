import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import {
  MAP_PLACE_MEDIA_RECORDS,
  createMapPlaceMediaFallback,
} from '../src/lib/map-place-media.js'
import { navigateInsideUnlockedApp, unlockToHome } from './helpers/navigation.js'
import { installProjectAssetRoute, prewarmProjectAssets } from './helpers/project-assets.js'

const OPENFREEMAP_HOST = 'tiles.openfreemap.org'
const VISUAL_EVIDENCE_DIR = fileURLToPath(
  new URL('../output/e2e/map-place-media/', import.meta.url),
)
const deterministicStyle = {
  version: 8,
  name: 'SchatPhone deterministic place-media map style',
  sources: {},
  layers: [{ id: 'background', type: 'background', paint: { 'background-color': '#dbe5df' } }],
}
const REAL_TRIALS = [
  ['seoul-gyeongbokgung', 'seoul-gyeongbokgung-hero-v1.webp', 'Exact-place photo'],
  ['seoul-station', 'seoul-station-hero-v1.webp', 'Exact-place photo'],
  ['seoul-forest', 'seoul-forest-hero-v1.webp', 'Exact-place photo'],
  ['seoul-sm-hq', 'seoul-sm-hq-hero-v1.webp', 'Area view'],
  ['seoul-starfield-coex-mall', 'seoul-starfield-coex-mall-hero-v1.webp', 'Exact-place photo'],
  ['seoul-myeongdong-kyoja-main', 'seoul-myeongdong-kyoja-main-hero-v1.webp', 'Area view'],
  ['seoul-sillim-one-room-district', 'seoul-sillim-one-room-district-hero-v1.webp', 'Area view'],
]

const mockOpenFreeMapStyle = async (page) => {
  await page.route(`https://${OPENFREEMAP_HOST}/**`, async (route) => {
    const { pathname } = new URL(route.request().url())
    if (pathname === '/styles/liberty') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(deterministicStyle),
      })
      return
    }
    await route.abort('blockedbyclient')
  })
}

const seedEnglish = async (page) => {
  await page.addInitScript(() => {
    const now = Date.now()
    window.__copiedMapAddress = ''
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: async (value) => {
          window.__copiedMapAddress = value
        },
      },
    })
    window.localStorage.setItem(
      'schatphone:store:system',
      JSON.stringify({
        version: 1,
        savedAt: now,
        data: { settings: { system: { language: 'en-US' } } },
      }),
    )
  })
}

const expectNoHorizontalOverflow = async (page) => {
  const overflow = await page.evaluate(() => {
    const sheet = document.querySelector('[data-testid="map-place-detail-sheet"]')
    return {
      document: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      body: document.body.scrollWidth - document.body.clientWidth,
      sheet: sheet instanceof HTMLElement ? sheet.scrollWidth - sheet.clientWidth : 0,
    }
  })
  expect(overflow.document).toBeLessThanOrEqual(1)
  expect(overflow.body).toBeLessThanOrEqual(1)
  expect(overflow.sheet).toBeLessThanOrEqual(1)
}

const captureVisualEvidence = async (page, testInfo, name) => {
  await mkdir(VISUAL_EVIDENCE_DIR, { recursive: true })
  const filename = `${testInfo.project.name}-${name}.png`
  const body = await page.screenshot({
    path: join(VISUAL_EVIDENCE_DIR, filename),
    animations: 'disabled',
  })
  await testInfo.attach(filename, { body, contentType: 'image/png' })
}

test.describe('Map place media governance', () => {
  test('renders reviewed exact/area photos and an explicit player-place fallback', async ({ page }, testInfo) => {
    const pageErrors = []
    const assetFailures = []
    page.on('pageerror', (error) => pageErrors.push(error.message))
    page.on('requestfailed', (request) => {
      if (request.url().includes('/apps/map/places/real-seoul-v1/')) {
        assetFailures.push(`${request.url()}: ${request.failure()?.errorText || 'failed'}`)
      }
    })

    await page.emulateMedia({ reducedMotion: 'reduce' })
    await mockOpenFreeMapStyle(page)
    await seedEnglish(page)
    await unlockToHome(page)
    await prewarmProjectAssets(
      page.request,
      [
        ...MAP_PLACE_MEDIA_RECORDS.map((record) => record.asset?.url),
        createMapPlaceMediaFallback({ id: 'address:1' }, 'real-seoul-v1').asset.url,
      ].filter(Boolean),
    )
    await installProjectAssetRoute(page)

    let exactMediaHeight = 0
    for (const [placeId, filename, expectedKind] of REAL_TRIALS) {
      await navigateInsideUnlockedApp(
        page,
        `/map?placeId=${encodeURIComponent(placeId)}&mapPackId=real-seoul-v1`,
      )
      const sheet = page.getByTestId('map-place-detail-sheet')
      const media = page.getByTestId('map-place-media')
      const image = page.getByTestId('map-place-media-image')
      await expect(sheet).toBeVisible()
      await expect(sheet).toHaveAttribute('role', 'region')
      await expect(media).toContainText(expectedKind)
      await expect(sheet.getByTestId('map-place-summary')).not.toHaveText(
        /Museums, palaces|Companies, offices|Dining, entertainment/,
      )
      await expect(image).toHaveAttribute('src', new RegExp(`${filename.replaceAll('.', '\\.')}($|\\?)`))
      await expect.poll(() => image.evaluate((element) => element.complete && element.naturalWidth > 0)).toBe(true)
      await expectNoHorizontalOverflow(page)

      if (placeId === 'seoul-gyeongbokgung') {
        await expect(sheet.getByTestId('map-place-use-destination')).toBeInViewport({ ratio: 0.95 })
        await expect(sheet.getByTestId('map-place-open-detail')).toBeInViewport({ ratio: 0.95 })
        await expect(sheet.getByTestId('map-place-entry-action')).toBeInViewport({ ratio: 0.95 })
        exactMediaHeight = await media.evaluate((element) => element.getBoundingClientRect().height)
        await captureVisualEvidence(page, testInfo, 'exact-place')
        await sheet.getByTestId('map-place-open-detail').click()
        await expect(page.getByTestId('map-place-detail-media')).toBeVisible()
        await expect(page.getByTestId('map-place-about-section')).toBeVisible()
        await expect(page.getByTestId('map-place-location-section')).toBeVisible()
        await expect(page.getByTestId('map-place-state-section')).toHaveCount(0)
        await expect(page.getByTestId('map-place-footprints-section')).toHaveCount(0)
        await expect(page.getByTestId('map-place-language-section')).toHaveCount(0)
        const mediaInfo = page.getByTestId('map-place-media-source')
        await expect(mediaInfo).not.toHaveAttribute('open', '')
        await expect(mediaInfo.locator('summary')).toContainText('Image information')
        await expect(mediaInfo.locator('a[href*="commons.wikimedia.org"]')).not.toBeVisible()
        await expectNoHorizontalOverflow(page)
        await captureVisualEvidence(page, testInfo, 'place-detail')
        await mediaInfo.locator('summary').click()
        await expect(mediaInfo.locator('a[href*="commons.wikimedia.org"]')).toBeVisible()
        await expect(mediaInfo.locator('a[href*="creativecommons.org"]')).toBeVisible()
        await page.getByTestId('map-place-copy-address').click()
        await expect(page.getByTestId('map-place-address-copy-notice')).toContainText(
          'Address copied',
        )
        await expect.poll(() => page.evaluate(() => window.__copiedMapAddress)).toBe(
          '161 Sajik-ro, Jongno-gu, Seoul',
        )
        await expectNoHorizontalOverflow(page)
        await page.keyboard.press('Escape')
        await expect(sheet).toHaveCount(0)
      }
      if (placeId === 'seoul-sm-hq') {
        await image.evaluate((element) => element.decode())
        await captureVisualEvidence(page, testInfo, 'area-atmosphere')
        await sheet.getByTestId('map-place-open-detail').click()
        await expect(sheet.getByTestId('map-place-media-source')).toContainText(
          'not the exact facade',
        )
      }
    }

    await navigateInsideUnlockedApp(
      page,
      '/map?placeId=address%3A1&mapPackId=real-seoul-v1',
    )
    const fallback = page.getByTestId('map-place-media')
    await expect(page.getByTestId('map-place-media-truth')).toContainText('not its real appearance')
    const fallbackImage = page.getByTestId('map-place-media-image')
    await expect(fallbackImage).toHaveAttribute('src', /seoul-street-map-v1\.webp$/)
    await expect.poll(() => fallbackImage.evaluate((element) => element.complete && element.naturalWidth > 0)).toBe(true)
    await expect(page.locator('.map-place-focus-media')).toHaveCount(1)
    const fallbackHeight = await fallback.evaluate((element) => element.getBoundingClientRect().height)
    expect(exactMediaHeight).toBeGreaterThan(0)
    expect(Math.abs(fallbackHeight - exactMediaHeight)).toBeLessThanOrEqual(2)
    if (testInfo.project.name === 'mobile-chrome') {
      await expect(page.getByTestId('map-place-open-detail')).toBeInViewport({ ratio: 0.95 })
      await expect(page.getByTestId('map-place-enter')).toBeInViewport({ ratio: 0.95 })
    }
    const currentAction = page.getByTestId('map-place-current-location-action')
    await expect(currentAction).toHaveAttribute('data-primary-state', 'current')
    const targetFloor = testInfo.project.name === 'mobile-chrome' ? 44 : 40
    for (const control of [
      currentAction,
      page.getByTestId('map-place-open-detail'),
      page.getByTestId('map-place-enter'),
    ]) {
      const box = await control.boundingBox()
      expect(box?.height || 0).toBeGreaterThanOrEqual(targetFloor)
    }
    await expectNoHorizontalOverflow(page)
    await captureVisualEvidence(page, testInfo, 'player-place-fallback')

    await currentAction.click()
    await expect(page.getByTestId('map-place-primary-action-notice')).toContainText(
      'You are currently here',
    )
    await expect(page.getByTestId('map-primary-route-card')).toHaveCount(0)
    await captureVisualEvidence(page, testInfo, 'current-location-feedback')

    const accessibility = await new AxeBuilder({ page })
      .include('[data-testid="map-place-detail-sheet"]')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze()
    expect(accessibility.violations.filter((violation) => violation.impact === 'critical')).toEqual([])
    expect(pageErrors).toEqual([])
    expect(assetFailures).toEqual([])
  })
})
