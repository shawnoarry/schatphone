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
const MBC_PLACE = {
  placeId: PLACE_ID,
  label: 'MBC Sangam Headquarters',
  detail: '267 Seongam-ro, Mapo-gu, Seoul',
  position: { kind: 'geo', lat: 37.5811, lng: 126.8905 },
}
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
      const seedKey = 'e2e:map-kpop-event:scenario-seeded'
      if (window.sessionStorage.getItem(seedKey) === '1') return
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
      window.sessionStorage.setItem(seedKey, '1')
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

const moveNearMbcCurrentLocation = async (page) => {
  await page.goto('/schatphone/manifest.webmanifest')
  await page.evaluate(async (place) => {
    const key = 'schatphone:store:map'
    const now = Date.now()
    const envelope = JSON.parse(window.localStorage.getItem(key) || 'null') || {
      version: 4,
      savedAt: now,
      data: {},
    }
    const data = envelope.data || envelope
    data.activeMapPackId = 'real-seoul-v1'
    data.currentLocation = {
      source: 'saved',
      label: 'Near MBC',
      detail: 'About seven meters from MBC',
      mapPackId: 'real-seoul-v1',
      placeId: '',
      position: { ...place.position, lat: place.position.lat + 0.000063 },
      positionEvidence: {
        provenance: 'manual',
        placeId: '',
        evidenceAt: now,
        journeyId: '',
        journeyArrivedAt: 0,
      },
    }
    data.tripForm = { ...(data.tripForm || {}), from: 'About seven meters from MBC' }
    envelope.data = data
    envelope.savedAt = now
    if (envelope.generation?.lineage) {
      envelope.generation = {
        ...envelope.generation,
        sequence: Math.max(0, Number(envelope.generation.sequence) || 0) + 1,
      }
    }
    const raw = JSON.stringify(envelope)
    window.localStorage.setItem(key, raw)

    const db = await new Promise((resolve, reject) => {
      const request = window.indexedDB.open('schatphone-layered-storage', 1)
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains('state')) {
          request.result.createObjectStore('state', { keyPath: 'key' })
        }
      }
      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result)
    })
    await new Promise((resolve, reject) => {
      const transaction = db.transaction('state', 'readwrite')
      transaction.objectStore('state').put({ key, payload: raw, updatedAt: now })
      transaction.oncomplete = resolve
      transaction.onerror = () => reject(transaction.error)
      transaction.onabort = () => reject(transaction.error)
    })
    db.close()
  }, MBC_PLACE)
  await unlockToHome(page)
  await navigateInsideUnlockedApp(page, '/map')
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
    await moveNearMbcCurrentLocation(page)

    await expect(page.getByTestId('map-place-context')).toContainText(/7 m away|距当前位置 7 米/)
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
    await moveNearMbcCurrentLocation(page)
    await page.getByTestId('map-place-enter').click()

    await expect(page.getByTestId('map-place-leave')).toBeVisible()
    await expect(page.getByTestId('map-place-event-invitation')).toHaveCount(0)
    await expect(page.getByTestId('map-place-expand-event')).toHaveCount(0)
    expect((await readPersistedData(page, 'schatphone:store:simulation')).eventInstances).toEqual([])
    await expectNoHorizontalOverflow(page, 'map-place-detail-sheet')
    await captureVisualEvidence(page, testInfo, 'off-pack-no-event')
    expect(pageErrors).toEqual([])
  })

  test('opens a non-persistent development preview at an ordinary entered place', async ({ page }) => {
    const pageErrors = []
    page.on('pageerror', (error) => pageErrors.push(error.message))
    await mockOpenFreeMapStyle(page)
    await seedEventScenario(page)
    await unlockToHome(page)
    await navigateInsideUnlockedApp(page, '/map')

    await page.getByTestId('map-destination-search').fill('家')
    const homeResult = page
      .getByTestId('map-local-place-results')
      .locator('.map-place-result')
      .filter({ hasText: '家' })
      .first()
    await expect(homeResult).toBeVisible()
    await homeResult.click()
    await page.getByTestId('map-place-enter').click()

    await expect(page.getByTestId('map-place-event-invitation')).toHaveCount(0)
    await expect(page.getByTestId('map-place-event-preview')).toBeVisible()
    await page.getByTestId('map-place-preview-event').click()
    await expect(page.getByTestId('map-event-surface-sheet')).toContainText(/Test preview|测试预览/)
    await expect(page.getByTestId('map-event-choices').getByRole('button')).toHaveCount(3)
    await page.getByTestId('map-event-choice-wait_for_staff').click()
    await expect(page.getByTestId('map-event-consequence')).toBeVisible()
    expect((await readPersistedData(page, 'schatphone:store:simulation')).eventInstances).toEqual([])
    expect(pageErrors).toEqual([])
  })

  test('confirms an existing pin as role position without blocking the coincident place pin', async ({ page }) => {
    const pageErrors = []
    page.on('pageerror', (error) => pageErrors.push(error.message))
    await mockOpenFreeMapStyle(page)
    await seedEventScenario(page)
    await unlockToHome(page)
    await navigateInsideUnlockedApp(page, '/map')

    await openMbcPlace(page)
    await page.getByTestId('map-place-detail-sheet').getByRole('button', { name: /Close|关闭/ }).click()
    await page.waitForTimeout(500)
    await page.getByTestId('map-set-current-location').click()
    await expect(page.getByTestId('map-role-position-mode')).toContainText(
      /choose an existing place pin|选择已有地点图钉/,
    )
    const mbcMarker = page.locator('.openfreemap-marker-button[aria-label*="MBC"]').first()
    await expect(mbcMarker).toBeVisible()
    await mbcMarker.click()

    await expect(page.locator('.app-dialog-title')).toContainText(
      /Set role position here|将角色位置设为这里/,
    )
    expect((await readPersistedData(page, 'schatphone:store:map')).currentLocation.placeId).not.toBe(
      PLACE_ID,
    )
    await page.getByRole('button', { name: /Confirm location|确认位置/ }).click()
    await expect(page.getByTestId('map-role-position-feedback')).toBeVisible()
    await expect
      .poll(async () => (await readPersistedData(page, 'schatphone:store:map')).currentLocation)
      .toMatchObject({ source: 'map_place', placeId: PLACE_ID, position: MBC_PLACE.position })

    const markerLayerState = await page.locator('.openfreemap-marker-button').evaluateAll(
      (markers) => {
        const roleIndex = markers.findIndex((marker) => marker.classList.contains('is-role-position'))
        const placeIndex = markers.findIndex((marker) => marker.getAttribute('aria-label')?.includes('MBC'))
        return {
          roleIndex,
          placeIndex,
          rolePointerEvents:
            roleIndex >= 0 ? window.getComputedStyle(markers[roleIndex]).pointerEvents : '',
        }
      },
    )
    expect(markerLayerState.roleIndex).toBeGreaterThanOrEqual(0)
    expect(markerLayerState.roleIndex).toBeLessThan(markerLayerState.placeIndex)
    expect(markerLayerState.rolePointerEvents).toBe('none')

    await page.locator('.openfreemap-marker-button[aria-label*="MBC"]').first().click()
    await expect(page.getByTestId('map-place-detail-sheet')).toBeVisible()
    expect(pageErrors).toEqual([])
  })
})
