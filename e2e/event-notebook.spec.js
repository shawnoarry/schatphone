import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { navigateInsideUnlockedApp, unlockToHome } from './helpers/navigation.js'

const OPENFREEMAP_HOST = 'tiles.openfreemap.org'
const VISUAL_EVIDENCE_DIR = fileURLToPath(
  new URL('../output/e2e/event-notebook/', import.meta.url),
)
const MBC_PLACE = {
  placeId: 'seoul-mbc-hq',
  label: 'MBC Sangam Headquarters',
  detail: '267 Seongam-ro, Mapo-gu, Seoul',
  position: { kind: 'geo', lat: 37.5811, lng: 126.8905 },
}

const deterministicStyle = {
  version: 8,
  name: 'SchatPhone deterministic Event Notebook map style',
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

const seedEnglishWorld = async (page) => {
  await page.addInitScript(() => {
    const seedKey = 'e2e:event-notebook:world-seeded'
    if (window.sessionStorage.getItem(seedKey) === '1') return
    const now = Date.now()
    window.localStorage.setItem(
      'schatphone:store:system',
      JSON.stringify({
        version: 1,
        savedAt: now,
        data: {
          settings: { system: { language: 'en-US' } },
          user: {
            globalWorldview:
              'Present-day Seoul with a realistic K-pop production and everyday social setting.',
            worldBook:
              'Present-day Seoul with a realistic K-pop production and everyday social setting.',
          },
        },
      }),
    )
    window.sessionStorage.setItem(seedKey, '1')
  })
}

const readSimulation = (page) =>
  page.evaluate(() => {
    const envelope = JSON.parse(
      window.localStorage.getItem('schatphone:store:simulation') || 'null',
    )
    return envelope?.data || null
  })

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

const createKpopEventInstance = async (page) => {
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
      label: place.label,
      detail: place.detail,
      mapPackId: 'real-seoul-v1',
      placeId: place.placeId,
      position: place.position,
      positionEvidence: {
        provenance: 'manual',
        placeId: place.placeId,
        evidenceAt: now,
        journeyId: '',
        journeyArrivedAt: 0,
      },
    }
    data.tripForm = { ...(data.tripForm || {}), from: place.detail }
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
  await page.getByTestId('map-place-enter').click()
  await expect(page.getByTestId('map-place-event-invitation')).toBeVisible()
  await page.getByTestId('map-place-expand-event').click()
  await expect(page.getByTestId('map-event-surface-sheet')).toBeVisible()
  await expect
    .poll(async () => (await readSimulation(page))?.eventInstances?.length || 0)
    .toBe(1)
}

const expectNoHorizontalOverflow = async (page) => {
  const overflow = await page.evaluate(() => {
    const panel = document.querySelector('[data-testid="control-center-event-log-panel"]')
    return {
      document: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      body: document.body.scrollWidth - document.body.clientWidth,
      panel: panel instanceof HTMLElement ? panel.scrollWidth - panel.clientWidth : 0,
    }
  })
  expect(overflow.document, 'document should not overflow horizontally').toBeLessThanOrEqual(1)
  expect(overflow.body, 'body should not overflow horizontally').toBeLessThanOrEqual(1)
  expect(overflow.panel, 'Event Notebook should not overflow horizontally').toBeLessThanOrEqual(1)
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

test.describe('EVE-3 World Hub Event Notebook', () => {
  test('reviews the Map K-pop Event Instance and persists event-only notes', async ({ page }, testInfo) => {
    const pageErrors = []
    const consoleErrors = []
    page.on('pageerror', (error) => pageErrors.push(error.message))
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text())
    })
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await mockOpenFreeMapStyle(page)
    await seedEnglishWorld(page)
    await unlockToHome(page)
    await navigateInsideUnlockedApp(page, '/map')
    await createKpopEventInstance(page)

    const sourceBefore = await readSimulation(page)
    expect(sourceBefore.eventInstances).toHaveLength(1)
    expect(sourceBefore.eventInstances[0]).toMatchObject({
      lifecycle: 'active',
      templateRef: { id: 'workplace.arrival_briefing' },
      source: { moduleKey: 'map', recordType: 'map_place_session' },
    })

    await navigateInsideUnlockedApp(page, '/control-center')
    const panel = page.getByTestId('control-center-event-log-panel')
    await panel.scrollIntoViewIfNeeded()
    await expect(panel).toBeVisible()
    await expect(panel).toContainText('Event Notebook')
    await expect(panel).toContainText('Production arrival briefing')
    await page
      .getByTestId('control-center-event-notebook-source-filter')
      .selectOption('event_instance')
    await expect(page.getByTestId('control-center-event-log-item')).toHaveCount(1)
    await page.getByTestId('control-center-event-log-item').click()
    await expect(page.getByTestId('control-center-event-log-detail')).toContainText(
      'map.place_session.validate_event_resolution',
    )

    await expectNoHorizontalOverflow(page)
    const accessibility = await new AxeBuilder({ page })
      .include('[data-testid="control-center-event-log-panel"]')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze()
    const criticalViolations = accessibility.violations.filter(
      (violation) => violation.impact === 'critical',
    )
    await testInfo.attach('event-notebook-accessibility.json', {
      body: Buffer.from(JSON.stringify(accessibility.violations, null, 2)),
      contentType: 'application/json',
    })
    expect(criticalViolations).toEqual([])

    const noteText = 'Verify the source-owner result before the next production block.'
    await page.getByTestId('control-center-event-review-note-input').fill(noteText)
    await page.getByTestId('control-center-event-review-note-submit').click()
    await expect(page.getByTestId('control-center-event-review-note')).toContainText(noteText)
    await expect
      .poll(async () => (await readSimulation(page))?.eventReviewNotes?.length || 0)
      .toBe(1)
    await captureVisualEvidence(page, testInfo, 'note-created')

    await navigateInsideUnlockedApp(page, '/home')
    await navigateInsideUnlockedApp(page, '/control-center')
    await expect(page.getByTestId('control-center-event-log-panel')).toBeVisible()
    await page.getByTestId('control-center-event-log-panel').scrollIntoViewIfNeeded()
    await expect(page.getByTestId('control-center-event-review-note')).toContainText(noteText)
    const persistedAfterReload = await readSimulation(page)
    expect(persistedAfterReload.eventLogs).toEqual(sourceBefore.eventLogs)
    expect(persistedAfterReload.eventInstances).toEqual(sourceBefore.eventInstances)

    const noteId = persistedAfterReload.eventReviewNotes[0].id
    await page
      .getByTestId(`control-center-event-review-note-edit-${noteId}`)
      .click()
    await page
      .getByTestId('control-center-event-review-note-input')
      .fill('Updated event-only Notebook context.')
    await page.getByTestId('control-center-event-review-note-submit').click()
    await expect(page.getByTestId('control-center-event-review-note')).toContainText(
      'Updated event-only Notebook context.',
    )

    await page
      .getByTestId(`control-center-event-review-note-delete-${noteId}`)
      .click()
    await expect(page.getByTestId('control-center-event-review-note')).toHaveCount(0)
    await expect
      .poll(async () => (await readSimulation(page))?.eventReviewNotes?.length || 0)
      .toBe(0)
    const sourceAfter = await readSimulation(page)
    expect(sourceAfter.eventLogs).toEqual(sourceBefore.eventLogs)
    expect(sourceAfter.eventInstances).toEqual(sourceBefore.eventInstances)
    await expect(panel.getByRole('button', { name: /reminder|calendar|cheat/i })).toHaveCount(0)
    await expectNoHorizontalOverflow(page)
    await captureVisualEvidence(page, testInfo, 'note-deleted')
    expect(pageErrors).toEqual([])
    expect(consoleErrors).toEqual([])
  })
})
