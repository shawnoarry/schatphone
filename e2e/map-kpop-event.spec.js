import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { navigateInsideUnlockedApp, unlockToHome } from './helpers/navigation.js'

const OPENFREEMAP_HOST = 'tiles.openfreemap.org'
const VISUAL_EVIDENCE_DIR = fileURLToPath(
  new URL('../output/e2e/map-kpop-event/', import.meta.url),
)
const PLACE_ID = 'seoul-mbc-hq'
const DAILY_WORLDVIEW =
  'Present-day Seoul with a realistic K-pop production and everyday social setting.'
const SCI_FI_WORLDVIEW =
  'A cyberpunk near-future city shaped by advanced AI, orbital infrastructure, and corporate control.'

const deterministicStyle = {
  version: 8,
  name: 'SchatPhone deterministic event map style',
  sources: {},
  layers: [{ id: 'background', type: 'background', paint: { 'background-color': '#dbe5df' } }],
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

const seedEventScenario = async (
  page,
  { worldview = DAILY_WORLDVIEW } = {},
) => {
  await page.addInitScript(
    ({ worldviewText }) => {
      const now = Date.now()
      window.localStorage.setItem(
        'schatphone:store:system',
        JSON.stringify({
          version: 1,
          savedAt: now,
          data: {
            settings: { system: { language: 'en-US' } },
            user: { globalWorldview: worldviewText, worldBook: worldviewText },
          },
        }),
      )
    },
    { worldviewText: worldview },
  )
}

const openMbcPlace = async (page) => {
  const search = page.getByTestId('map-destination-search')
  await search.fill('MBC')
  const result = page
    .getByTestId('map-local-place-results')
    .locator('.map-place-result')
    .filter({ hasText: 'MBC' })
    .first()
  await expect(result).toBeVisible()
  await result.click()
  await expect(page.getByTestId('map-place-detail-sheet')).toBeVisible()
}

const moveMbcToCurrentLocation = async (page) => {
  await openMbcPlace(page)
  await page.getByTestId('map-place-open-detail').click()
  await page.getByTestId('map-place-set-current').click()
  await expect(page.getByTestId('map-place-detail-sheet')).toHaveCount(0)
  await openMbcPlace(page)
}

const expectNoHorizontalOverflow = async (page, sheetTestId = '') => {
  const overflow = await page.evaluate((testId) => {
    const sheet = testId ? document.querySelector(`[data-testid="${testId}"]`) : null
    return {
      document: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      body: document.body.scrollWidth - document.body.clientWidth,
      sheet: sheet instanceof HTMLElement ? sheet.scrollWidth - sheet.clientWidth : 0,
    }
  }, sheetTestId)
  expect(overflow.document).toBeLessThanOrEqual(1)
  expect(overflow.body).toBeLessThanOrEqual(1)
  expect(overflow.sheet).toBeLessThanOrEqual(1)
}

const readPersistedData = async (page, key) =>
  page.evaluate((storageKey) => {
    const envelope = JSON.parse(window.localStorage.getItem(storageKey) || 'null')
    return envelope?.data || null
  }, key)

const captureVisualEvidence = async (page, testInfo, name) => {
  await mkdir(VISUAL_EVIDENCE_DIR, { recursive: true })
  const filename = `${testInfo.project.name}-${name}.png`
  const body = await page.screenshot({
    path: join(VISUAL_EVIDENCE_DIR, filename),
    animations: 'disabled',
  })
  await testInfo.attach(filename, { body, contentType: 'image/png' })
}

test.describe('EVE-2C Map K-pop place-session events', () => {
  test('enters explicitly, expands local text, resolves, reopens, and returns to Map', async ({ page }, testInfo) => {
    const pageErrors = []
    page.on('pageerror', (error) => pageErrors.push(error.message))
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await mockOpenFreeMapStyle(page)
    await seedEventScenario(page)
    await unlockToHome(page)
    await navigateInsideUnlockedApp(page, '/map')
    await moveMbcToCurrentLocation(page)

    await expect(page.getByTestId('map-place-enter')).toBeVisible()
    await expect(page.getByTestId('map-place-event-invitation')).toHaveCount(0)
    await page.getByTestId('map-place-enter').click()
    const invitation = page.getByTestId('map-place-event-invitation')
    await expect(invitation).toBeVisible()
    await expect(invitation).toContainText(/Production|Briefing|arrival/i)
    expect((await readPersistedData(page, 'schatphone:store:simulation')).eventInstances).toEqual([])
    await expectNoHorizontalOverflow(page, 'map-place-detail-sheet')
    await captureVisualEvidence(page, testInfo, 'invitation')

    await page.getByTestId('map-place-expand-event').click()
    const eventSheet = page.getByTestId('map-event-surface-sheet')
    await expect(eventSheet).toBeVisible()
    await expect(eventSheet).toBeFocused()
    await expect(eventSheet).toContainText('Local text')
    await expect(page.getByTestId('map-event-choices').getByRole('button')).toHaveCount(3)
    await expect(page.locator('.openfreemap-marker-button.is-event')).toHaveCount(1)
    await expect(page.locator('.openfreemap-marker-button:not(.is-event)')).not.toHaveCount(0)
    await expectNoHorizontalOverflow(page, 'map-event-surface-sheet')

    const accessibility = await new AxeBuilder({ page })
      .include('[data-testid="map-event-surface-sheet"]')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze()
    const criticalViolations = accessibility.violations.filter(
      (violation) => violation.impact === 'critical',
    )
    await testInfo.attach('map-kpop-event-accessibility.json', {
      body: Buffer.from(JSON.stringify(accessibility.violations, null, 2)),
      contentType: 'application/json',
    })
    await captureVisualEvidence(page, testInfo, 'event-detail')
    expect(criticalViolations).toEqual([])

    await page.getByTestId('map-event-choice-review_brief').click()
    await expect(page.getByTestId('map-event-consequence')).toBeVisible()
    await page.getByTestId('map-event-return').click()
    await expect(page.getByTestId('map-place-leave')).toBeVisible()
    await expect(page.getByTestId('map-place-event-invitation')).toBeVisible()

    await page.getByTestId('map-place-expand-event').click()
    await expect(page.getByTestId('map-event-consequence')).toBeVisible()
    const simulation = await readPersistedData(page, 'schatphone:store:simulation')
    expect(simulation.eventInstances).toHaveLength(1)
    expect(simulation.eventInstances[0]).toMatchObject({
      lifecycle: 'resolved',
      choices: { selectedId: 'review_brief', outcomeId: 'brief_reviewed' },
      outcome: {
        requestState: 'validated',
        ownerResultCode: 'PLACE_SESSION_EVENT_RESOLUTION_VALID',
      },
    })

    await page.getByTestId('map-event-return').click()
    await page.getByTestId('map-place-leave').click()
    await expect(page.getByTestId('map-place-event-invitation')).toHaveCount(0)
    await expect(page.getByTestId('map-place-enter')).toBeVisible()
    const map = await readPersistedData(page, 'schatphone:store:map')
    expect(map.currentLocation.positionEvidence).toMatchObject({
      provenance: 'manual',
      placeId: PLACE_ID,
      journeyId: '',
      journeyArrivedAt: 0,
    })
    expect(map.placeSession).toMatchObject({ state: 'left', placeId: PLACE_ID })
    expect(map).not.toHaveProperty('eventInstances')
    expect(map).not.toHaveProperty('mapEventSurfaces')
    expect(pageErrors).toEqual([])
  })

  test('records exact Map Journey arrival provenance before allowing Enter', async ({ page }, testInfo) => {
    const pageErrors = []
    page.on('pageerror', (error) => pageErrors.push(error.message))
    await page.clock.install({ time: new Date('2026-08-10T10:00:00.000Z') })
    await mockOpenFreeMapStyle(page)
    await seedEventScenario(page)
    await unlockToHome(page)
    await navigateInsideUnlockedApp(page, '/map')

    await openMbcPlace(page)
    await page.getByTestId('map-place-use-destination').click()
    await expect(page.getByTestId('map-primary-route-card')).toBeVisible()
    await page.getByTestId('map-primary-transport-mode').click()
    await page.getByTestId('map-transport-mode-hired_vehicle').click()
    await page.getByTestId('map-trip-start').click()
    await expect(page.getByTestId('map-active-journey')).toBeVisible()
    await expect
      .poll(async () => await readPersistedData(page, 'schatphone:store:map'))
      .toMatchObject({
        tripState: {
          status: 'traveling',
          destinationPlaceId: PLACE_ID,
        },
      })
    const persistedTravelingMap = await readPersistedData(page, 'schatphone:store:map')
    const journeyId = persistedTravelingMap.tripState.journeyId
    const durationMs = persistedTravelingMap.tripState.durationSeconds * 1_000 + 1_000
    await page
      .getByTestId('map-secondary-drawer')
      .getByRole('button', { name: /Close/ })
      .click()
    await page.clock.fastForward(durationMs)

    await expect
      .poll(async () => (await readPersistedData(page, 'schatphone:store:map'))?.currentLocation?.positionEvidence)
      .toMatchObject({
        provenance: 'journey_arrival',
        placeId: PLACE_ID,
        journeyId,
      })
    const arrivedMap = await readPersistedData(page, 'schatphone:store:map')
    expect(arrivedMap.tripState).toMatchObject({
      status: 'arrived',
      destinationPlaceId: PLACE_ID,
    })

    await openMbcPlace(page)
    await expect(page.getByTestId('map-place-enter')).toBeVisible()
    await page.getByTestId('map-place-enter').click()
    await expect(page.getByTestId('map-place-event-invitation')).toBeVisible()
    await expectNoHorizontalOverflow(page, 'map-place-detail-sheet')
    await captureVisualEvidence(page, testInfo, 'journey-arrival')

    const enteredMap = await readPersistedData(page, 'schatphone:store:map')
    expect(enteredMap.placeSession).toMatchObject({
      state: 'inside',
      placeId: PLACE_ID,
      presence: {
        provenance: 'journey_arrival',
        journeyId,
      },
    })
    expect(pageErrors).toEqual([])
  })

  test('keeps off-pack place entry as a complete no-event path', async ({ page }, testInfo) => {
    const pageErrors = []
    page.on('pageerror', (error) => pageErrors.push(error.message))
    await mockOpenFreeMapStyle(page)
    await seedEventScenario(page, { worldview: SCI_FI_WORLDVIEW })
    await unlockToHome(page)
    await navigateInsideUnlockedApp(page, '/map')
    await moveMbcToCurrentLocation(page)
    await page.getByTestId('map-place-enter').click()

    await expect(page.getByTestId('map-place-leave')).toBeVisible()
    await expect(page.getByTestId('map-place-event-invitation')).toHaveCount(0)
    await expect(page.getByTestId('map-place-expand-event')).toHaveCount(0)
    expect((await readPersistedData(page, 'schatphone:store:simulation')).eventInstances).toEqual([])
    await expectNoHorizontalOverflow(page, 'map-place-detail-sheet')
    await captureVisualEvidence(page, testInfo, 'off-pack-no-event')
    expect(pageErrors).toEqual([])
  })
})
