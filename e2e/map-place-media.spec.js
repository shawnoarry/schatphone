import { createHash } from 'node:crypto'
import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import {
  MAP_PLACE_MEDIA_RECORDS,
  createMapPlaceMediaFallback,
  getMapPlaceMediaGallery,
} from '../src/lib/map-place-media.js'
import { navigateInsideUnlockedApp, unlockToHome } from './helpers/navigation.js'
import {
  fetchProjectAsset,
  installProjectAssetRoute,
  prewarmProjectAssets,
} from './helpers/project-assets.js'

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
  ['seoul-sm-hq', 'seoul-street-map-v1.webp', 'Category visual'],
  ['seoul-starfield-coex-mall', 'seoul-starfield-coex-mall-hero-v1.webp', 'Exact-place photo'],
  ['seoul-coex', 'seoul-coex-convention-center-hero-v1.webp', 'Exact-place photo'],
  ['seoul-myeongdong-kyoja-main', 'seoul-street-map-v1.webp', 'Category visual'],
  ['seoul-sillim-one-room-district', 'seoul-street-map-v1.webp', 'Category visual'],
  ['seoul-gwanghwamun', 'seoul-gwanghwamun-hero-v1.webp', 'Exact-place photo'],
  ['seoul-city-hall', 'seoul-city-hall-hero-v1.webp', 'Exact-place photo'],
  ['seoul-n-tower', 'seoul-n-tower-hero-v1.webp', 'Exact-place photo'],
  ['seoul-ddp', 'seoul-ddp-hero-v1.webp', 'Exact-place photo'],
  ['seoul-lotte-world-tower', 'seoul-lotte-world-tower-hero-v1.webp', 'Exact-place photo'],
  ['seoul-incheon-airport-t1', 'seoul-incheon-airport-t1-hero-v1.webp', 'Exact-place photo'],
  ['seoul-gimpo-airport', 'seoul-gimpo-airport-hero-v1.webp', 'Exact-place photo'],
  ['seoul-gangnam-station', 'seoul-gangnam-station-hero-v2.webp', 'Exact-place photo'],
  ['seoul-express-bus-terminal', 'seoul-express-bus-terminal-hero-v2.webp', 'Exact-place photo'],
  ['seoul-yongsan-station', 'seoul-yongsan-station-hero-v1.webp', 'Exact-place photo'],
  ['seoul-63-square', 'seoul-63-square-hero-v1.webp', 'Exact-place photo'],
  ['seoul-national-museum', 'seoul-national-museum-hero-v2.webp', 'Exact-place photo'],
  ['seoul-times-square', 'seoul-times-square-hero-v2.webp', 'Exact-place photo'],
  ['seoul-lotte-department-main', 'seoul-street-map-v1.webp', 'Category visual'],
  ['seoul-hyundai-apgujeong-main', 'seoul-street-map-v1.webp', 'Category visual'],
  ['seoul-olympic-park', 'seoul-olympic-park-hero-v1.webp', 'Exact-place photo'],
  ['seoul-metropolitan-police-agency', 'seoul-metropolitan-police-agency-hero-v1.webp', 'Exact-place photo'],
  ['seoul-fire-disaster-headquarters', 'seoul-fire-disaster-headquarters-hero-v1.webp', 'Exact-place photo'],
  ['seoul-gocheok-dome', 'seoul-gocheok-dome-hero-v1.webp', 'Exact-place photo'],
  ['seoul-shinhan-bank-headquarters', 'seoul-shinhan-bank-headquarters-hero-v1.webp', 'Exact-place photo'],
  ['seoul-ytn-newsquare', 'seoul-ytn-newsquare-hero-v1.webp', 'Exact-place photo'],
  ['seoul-yeouido-hangang-park', 'seoul-yeouido-hangang-park-hero-v1.webp', 'Exact-place photo'],
  ['seoul-four-seasons-hotel', 'seoul-four-seasons-hotel-hero-v1.webp', 'Exact-place photo'],
  ['seoul-asan-medical-center', 'seoul-asan-medical-center-hero-v1.webp', 'Exact-place photo'],
  ['seoul-kspo-dome', 'seoul-kspo-dome-hero-v1.webp', 'Exact-place photo'],
  ['seoul-sbs-hq', 'seoul-sbs-hq-hero-v1.webp', 'Exact-place photo'],
  ['seoul-amorepacific-hq', 'seoul-amorepacific-hq-hero-v1.webp', 'Exact-place photo'],
  ['seoul-gangnam-fire-station', 'seoul-gangnam-fire-station-hero-v1.webp', 'Exact-place photo'],
  ['seoul-samsung-town', 'seoul-samsung-town-hero-v1.webp', 'Exact-place photo'],
  ['seoul-jtbc-hq', 'seoul-jtbc-hq-hero-v1.webp', 'Exact-place photo'],
  ['seoul-sk-seorin', 'seoul-sk-seorin-hero-v1.webp', 'Exact-place photo'],
  ['seoul-shinsegae-gangnam', 'seoul-shinsegae-gangnam-hero-v1.webp', 'Exact-place photo'],
  ['seoul-megabox-coex', 'seoul-megabox-coex-hero-v1.webp', 'Exact-place photo'],
  ['seoul-mbc-hq', 'seoul-mbc-hq-hero-v1.webp', 'Exact-place photo'],
  ['seoul-cgv-yongsan-ipark', 'seoul-cgv-yongsan-ipark-hero-v1.webp', 'Exact-place photo'],
  ['seoul-galleria-luxury-hall', 'seoul-galleria-luxury-hall-hero-v1.webp', 'Exact-place photo'],
  ['seoul-hybe-hq', 'seoul-hybe-hq-hero-v1.webp', 'Exact-place photo'],
  ['seoul-lotte-avenuel-world-tower', 'seoul-street-map-v1.webp', 'Category visual'],
  ['seoul-namdaemun-pharmacy-district', 'seoul-street-map-v1.webp', 'Category visual'],
  ['seoul-london-bagel-museum-anguk', 'seoul-street-map-v1.webp', 'Category visual'],
  ['seoul-hongdae', 'seoul-street-map-v1.webp', 'Category visual'],
  ['seoul-sanggye-jugong-district', 'seoul-street-map-v1.webp', 'Category visual'],
  ['seoul-acro-river-park', 'seoul-street-map-v1.webp', 'Category visual'],
  ['seoul-hannam-the-hill', 'seoul-street-map-v1.webp', 'Category visual'],
]

const AREA_DETAIL_MEDIA = {
  'seoul-sm-hq': 'seoul-sm-hq-hero-v1.webp',
  'seoul-myeongdong-kyoja-main': 'seoul-myeongdong-kyoja-main-hero-v1.webp',
  'seoul-sillim-one-room-district': 'seoul-sillim-one-room-district-hero-v1.webp',
  'seoul-lotte-department-main': 'seoul-lotte-department-main-hero-v1.webp',
  'seoul-hyundai-apgujeong-main': 'seoul-hyundai-apgujeong-main-hero-v1.webp',
  'seoul-lotte-avenuel-world-tower': 'seoul-lotte-avenuel-world-tower-gallery-01-v1.webp',
  'seoul-namdaemun-pharmacy-district': 'seoul-namdaemun-pharmacy-district-gallery-01-v1.webp',
  'seoul-london-bagel-museum-anguk': 'seoul-london-bagel-museum-anguk-gallery-01-v1.webp',
  'seoul-hongdae': 'seoul-hongdae-street-gallery-01-v1.webp',
  'seoul-sanggye-jugong-district': 'seoul-sanggye-jugong-district-gallery-01-v1.webp',
  'seoul-acro-river-park': 'seoul-acro-river-park-gallery-01-v1.webp',
  'seoul-hannam-the-hill': 'seoul-hannam-the-hill-gallery-01-v1.webp',
}

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

const expectVerifiedProjectImage = async (request, image, expectedAsset) => {
  const url = await image.getAttribute('src')
  expect(url).toBeTruthy()
  const response = await fetchProjectAsset(request, url, { attempts: 1 })
  expect(response.status).toBe(200)
  expect(response.headers['content-type']).toContain(expectedAsset.mimeType)
  expect(createHash('sha256').update(response.body).digest('hex')).toBe(expectedAsset.sha256)
}

test.describe('Map place media governance', () => {
  test('renders reviewed exact/area photos and an explicit player-place fallback', async ({ page }, testInfo) => {
    test.setTimeout(180_000)
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
    await prewarmProjectAssets(
      page.request,
      [
        ...MAP_PLACE_MEDIA_RECORDS.map((record) => record.asset?.url),
        createMapPlaceMediaFallback({ id: 'address:1' }, 'real-seoul-v1').asset.url,
      ].filter(Boolean),
    )
    await installProjectAssetRoute(page)
    await unlockToHome(page)

    let exactMediaHeight = 0
    let overviewCardWidth = 0
    for (const [placeId, filename, expectedKind] of REAL_TRIALS) {
      const existingSheet = page.getByTestId('map-place-detail-sheet')
      if (await existingSheet.isVisible()) {
        await page.keyboard.press('Escape')
        await expect(existingSheet).toHaveCount(0)
        await navigateInsideUnlockedApp(page, '/map')
      }
      await navigateInsideUnlockedApp(
        page,
        `/map?placeId=${encodeURIComponent(placeId)}&mapPackId=real-seoul-v1`,
      )
      const sheet = page.getByTestId('map-place-detail-sheet')
      const media = page.getByTestId('map-place-media')
      const image = page.getByTestId('map-place-media-image')
      await expect(sheet, `Expected place sheet for ${placeId}`).toBeVisible()
      await expect(sheet).toHaveAttribute('role', 'region')
      await expect(media).toContainText(expectedKind)
      await expect(sheet.getByTestId('map-place-summary')).not.toHaveText(
        /Museums, palaces|Companies, offices|Dining, entertainment/,
      )
      await expect(image).toHaveAttribute('src', new RegExp(`${filename.replaceAll('.', '\\.')}($|\\?)`))
      await expect.poll(() => image.evaluate((element) => element.complete && element.naturalWidth > 0)).toBe(true)
      await expectNoHorizontalOverflow(page)

      const currentOverviewCardSize = await sheet.boundingBox()
      expect(currentOverviewCardSize).not.toBeNull()
      if (!overviewCardWidth) overviewCardWidth = currentOverviewCardSize.width
      else expect(Math.abs(currentOverviewCardSize.width - overviewCardWidth)).toBeLessThanOrEqual(1)

      if (AREA_DETAIL_MEDIA[placeId]) {
        await expect(sheet.getByTestId('map-place-media-truth')).toContainText(
          'not its real appearance',
        )
        await sheet.getByTestId('map-place-open-detail').click()
        const detailImage = sheet.getByTestId('map-place-detail-media-image')
        await expect(sheet.getByTestId('map-place-detail-media')).toContainText('Area view')
        await expect(detailImage).toHaveAttribute(
          'src',
          new RegExp(`${AREA_DETAIL_MEDIA[placeId].replaceAll('.', '\\.')}($|\\?)`),
        )
        await expect.poll(() => (
          detailImage.evaluate((element) => element.complete && element.naturalWidth > 0)
        )).toBe(true)
        const galleryRecords = getMapPlaceMediaGallery('real-seoul-v1', placeId)
        await expectVerifiedProjectImage(page.request, detailImage, galleryRecords[0].asset)
      }

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
        await captureVisualEvidence(page, testInfo, 'area-atmosphere')
        await expect(sheet.getByTestId('map-place-media-source')).toContainText(
          'not the exact facade',
        )
      }
      if (placeId === 'seoul-gwanghwamun') {
        await sheet.getByTestId('map-place-open-detail').click()
        const gallery = sheet.getByTestId('map-place-detail-media')
        const galleryRecords = getMapPlaceMediaGallery('real-seoul-v1', placeId)
        await expect(sheet.getByTestId('map-place-gallery-count')).toContainText('1 / 4')
        await expect(gallery).toContainText('Exact-place photo')
        await sheet.getByTestId('map-place-gallery-next').click()
        await expect(sheet.getByTestId('map-place-gallery-count')).toContainText('2 / 4')
        await expect(gallery).toContainText('Area view')
        await expect(sheet.getByTestId('map-place-media-source')).toContainText('Richard Mortel')
        const detailImage = sheet.getByTestId('map-place-detail-media-image')
        await expect.poll(() => (
          detailImage.evaluate(
            (element) => element.complete && element.naturalWidth > 0,
          )
        )).toBe(true)
        await expectVerifiedProjectImage(page.request, detailImage, galleryRecords[1].asset)
        await expectNoHorizontalOverflow(page)
        await captureVisualEvidence(page, testInfo, 'detail-gallery')
      }
      if (placeId === 'seoul-gimpo-airport') {
        await image.evaluate((element) => element.decode())
        await sheet.getByTestId('map-place-open-detail').click()
        const gallery = sheet.getByTestId('map-place-detail-media')
        const galleryRecords = getMapPlaceMediaGallery('real-seoul-v1', placeId)
        await expect(sheet.getByTestId('map-place-gallery-count')).toContainText('1 / 2')
        await sheet.getByTestId('map-place-gallery-next').click()
        await expect(sheet.getByTestId('map-place-gallery-count')).toContainText('2 / 2')
        await expect(gallery).toContainText('Area view')
        await expect(sheet.getByTestId('map-place-media-source')).toContainText('Magicsgram')
        await expectVerifiedProjectImage(
          page.request,
          sheet.getByTestId('map-place-detail-media-image'),
          galleryRecords[1].asset,
        )
        await captureVisualEvidence(page, testInfo, 'expansion-exact')
      }
      if (placeId === 'seoul-hyundai-apgujeong-main') {
        await captureVisualEvidence(page, testInfo, 'expansion-area')
      }
      if (placeId === 'seoul-times-square') {
        await sheet.getByTestId('map-place-open-detail').click()
        const galleryRecords = getMapPlaceMediaGallery('real-seoul-v1', placeId)
        const detailImage = sheet.getByTestId('map-place-detail-media-image')
        await expect(sheet.getByTestId('map-place-gallery-count')).toContainText('1 / 3')
        await expect.poll(() => (
          detailImage.evaluate((element) => element.complete && element.naturalWidth > 0)
        )).toBe(true)
        await sheet.getByTestId('map-place-gallery-next').click()
        await expect(sheet.getByTestId('map-place-gallery-count')).toContainText('2 / 3')
        await expect(sheet.getByTestId('map-place-detail-media')).toContainText('Area view')
        await expect.poll(() => (
          detailImage.evaluate((element) => element.complete && element.naturalWidth > 0)
        )).toBe(true)
        await sheet.getByTestId('map-place-gallery-next').click()
        await expect(sheet.getByTestId('map-place-gallery-count')).toContainText('3 / 3')
        await expect(sheet.getByTestId('map-place-detail-media')).toContainText('Exact-place photo')
        await expect(sheet.getByTestId('map-place-media-source')).toContainText('Narubaru7')
        await expectVerifiedProjectImage(
          page.request,
          detailImage,
          galleryRecords[2].asset,
        )
        await captureVisualEvidence(page, testInfo, 'times-square-gallery')
      }
      if (placeId === 'seoul-samsung-town') {
        await sheet.getByTestId('map-place-open-detail').click()
        const galleryRecords = getMapPlaceMediaGallery('real-seoul-v1', placeId)
        const detailImage = sheet.getByTestId('map-place-detail-media-image')
        await expect(sheet.getByTestId('map-place-gallery-count')).toContainText('1 / 3')
        await sheet.getByTestId('map-place-gallery-next').click()
        await expect(sheet.getByTestId('map-place-gallery-count')).toContainText('2 / 3')
        await expect(sheet.getByTestId('map-place-detail-media')).toContainText('Area view')
        await expectVerifiedProjectImage(page.request, detailImage, galleryRecords[1].asset)
      }
      if (placeId === 'seoul-gangnam-station') {
        await sheet.getByTestId('map-place-open-detail').click()
        const galleryRecords = getMapPlaceMediaGallery('real-seoul-v1', placeId)
        const detailImage = sheet.getByTestId('map-place-detail-media-image')
        await expect(sheet.getByTestId('map-place-gallery-count')).toContainText('1 / 5')
        await sheet.getByTestId('map-place-gallery-next').click()
        await expect(sheet.getByTestId('map-place-gallery-count')).toContainText('2 / 5')
        await expect(sheet.getByTestId('map-place-detail-media')).toContainText('Exact-place photo')
        await expectVerifiedProjectImage(page.request, detailImage, galleryRecords[1].asset)
      }
      if (placeId === 'seoul-cgv-yongsan-ipark') {
        await sheet.getByTestId('map-place-open-detail').click()
        const galleryRecords = getMapPlaceMediaGallery('real-seoul-v1', placeId)
        const detailImage = sheet.getByTestId('map-place-detail-media-image')
        await expect(sheet.getByTestId('map-place-gallery-count')).toContainText('1 / 2')
        await sheet.getByTestId('map-place-gallery-next').click()
        await expect(sheet.getByTestId('map-place-gallery-count')).toContainText('2 / 2')
        await expectVerifiedProjectImage(page.request, detailImage, galleryRecords[1].asset)
      }
      if (placeId === 'seoul-hybe-hq') {
        await sheet.getByTestId('map-place-open-detail').click()
        const galleryRecords = getMapPlaceMediaGallery('real-seoul-v1', placeId)
        const detailImage = sheet.getByTestId('map-place-detail-media-image')
        await expect(sheet.getByTestId('map-place-gallery-count')).toContainText('1 / 3')
        await sheet.getByTestId('map-place-gallery-next').click()
        await expect(sheet.getByTestId('map-place-gallery-count')).toContainText('2 / 3')
        await expectVerifiedProjectImage(page.request, detailImage, galleryRecords[1].asset)
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

    if (testInfo.project.name === 'chromium') {
      await page.setViewportSize({ width: 600, height: 549 })
      await navigateInsideUnlockedApp(
        page,
        '/map?placeId=seoul-fnc-hq&mapPackId=real-seoul-v1',
      )
      const compactSheet = page.getByTestId('map-place-detail-sheet')
      const compactActions = compactSheet.locator('.map-place-focus-actions')
      const actionsBox = await compactActions.boundingBox()
      expect(actionsBox).not.toBeNull()
      for (const content of [
        compactSheet.getByTestId('map-place-summary'),
        compactSheet.getByTestId('map-place-context'),
        compactSheet.getByTestId('map-place-media-truth'),
      ]) {
        const contentBox = await content.boundingBox()
        expect(contentBox).not.toBeNull()
        expect(contentBox.y + contentBox.height).toBeLessThanOrEqual(actionsBox.y + 1)
      }
      await expect(compactSheet.locator('.map-place-overview-content')).not.toHaveCSS(
        'overflow-y',
        'auto',
      )
      await captureVisualEvidence(page, testInfo, 'compact-overview-typography')
    }

    const accessibility = await new AxeBuilder({ page })
      .include('[data-testid="map-place-detail-sheet"]')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze()
    expect(accessibility.violations.filter((violation) => violation.impact === 'critical')).toEqual([])
    expect(pageErrors).toEqual([])
    expect(assetFailures).toEqual([])
  })
})
