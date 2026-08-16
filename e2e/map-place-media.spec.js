import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { navigateInsideUnlockedApp, unlockToHome } from './helpers/navigation.js'

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

    for (const [placeId, filename, expectedKind] of REAL_TRIALS) {
      await navigateInsideUnlockedApp(
        page,
        `/map?placeId=${encodeURIComponent(placeId)}&mapPackId=real-seoul-v1`,
      )
      const sheet = page.getByTestId('map-place-detail-sheet')
      const media = page.getByTestId('map-place-media')
      const image = page.getByTestId('map-place-media-image')
      await expect(sheet).toBeVisible()
      await expect(media).toContainText(expectedKind)
      await expect(image).toHaveAttribute('src', new RegExp(`${filename.replaceAll('.', '\\.')}($|\\?)`))
      await expect.poll(() => image.evaluate((element) => element.complete && element.naturalWidth > 0)).toBe(true)
      await expect(media.locator('a[href*="commons.wikimedia.org"]')).toHaveCount(1)
      await expect(media.locator('a[href*="creativecommons.org"]')).toHaveCount(1)
      await expectNoHorizontalOverflow(page)

      if (placeId === 'seoul-gyeongbokgung') {
        await captureVisualEvidence(page, testInfo, 'exact-place')
      }
      if (placeId === 'seoul-sm-hq') {
        await expect(media).toContainText('not the exact facade')
        await captureVisualEvidence(page, testInfo, 'area-atmosphere')
      }
    }

    await navigateInsideUnlockedApp(
      page,
      '/map?placeId=address%3A1&mapPackId=real-seoul-v1',
    )
    const fallback = page.getByTestId('map-place-media')
    await expect(fallback).toContainText('Category visual')
    await expect(fallback).toContainText('not its real appearance')
    await expect(page.getByTestId('map-place-media-image')).toHaveCount(0)
    await expect(page.getByTestId('map-place-media-fallback')).toBeVisible()
    await expectNoHorizontalOverflow(page)
    await captureVisualEvidence(page, testInfo, 'player-place-fallback')

    const accessibility = await new AxeBuilder({ page })
      .include('[data-testid="map-place-detail-sheet"]')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze()
    expect(accessibility.violations.filter((violation) => violation.impact === 'critical')).toEqual([])
    expect(pageErrors).toEqual([])
    expect(assetFailures).toEqual([])
  })
})
