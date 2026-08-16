import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { navigateInsideUnlockedApp, unlockToHome } from './helpers/navigation.js'

const evidenceDir = fileURLToPath(new URL('../output/e2e/agenda-journey-cja3/', import.meta.url))
const deterministicStyle = {
  version: 8,
  name: 'SchatPhone deterministic map style',
  sources: {},
  layers: [{ id: 'background', type: 'background', paint: { 'background-color': '#dbe5df' } }],
}

const mockOpenFreeMapStyle = async (page) => {
  await page.route('https://tiles.openfreemap.org/**', async (route) => {
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

const seedAgendaJourneys = async (page) => {
  await page.addInitScript(() => {
    const now = Date.now()
    const locationRef = {
      owner: 'map',
      mapPackId: 'real-seoul-v1',
      placeId: 'seoul-sm-hq',
      labelZh: 'SM 娱乐总部',
      labelEn: 'SM Entertainment HQ',
    }
    const buildStep = ({ journeyId, kind, sequence, status, titleZh, titleEn, mapJourneyId = '' }) => ({
      id: `${journeyId}::${kind}`,
      agendaJourneyId: journeyId,
      sequence,
      kind,
      titleZh,
      titleEn,
      status,
      requirement: 'required',
      completionPolicy: kind === 'travel' ? 'map_arrival' : 'user_confirmation',
      scheduledStartsAt: now + 60 * 60_000,
      scheduledEndsAt: now + 2 * 60 * 60_000,
      desiredArrivalAt: kind === 'travel' ? now + 60 * 60_000 : 0,
      locationRef,
      transportMode: 'public_transit',
      mapJourneyId,
      evidenceRefs: mapJourneyId
        ? [{ owner: 'map', type: 'map_journey_arrival', recordId: mapJourneyId, status: 'arrived', observedAt: now - 10 * 60_000 }]
        : [],
      startedAt: mapJourneyId ? now - 30 * 60_000 : 0,
      completedAt: mapJourneyId ? now - 10 * 60_000 : 0,
      updatedAt: now,
    })
    const readyId = `aj::e2e::ready::${now}`
    const departureId = `aj::e2e::departure::${now}`
    window.localStorage.setItem(
      'schatphone:store:system',
      JSON.stringify({
        version: 1,
        savedAt: now,
        data: {
          settings: {
            system: { language: 'en-US', notifications: false, realPushEnabled: false },
            appearance: { currentTheme: 'default', wallpaperMode: 'theme' },
          },
        },
      }),
    )
    window.localStorage.setItem(
      'schatphone:store:agenda-journey',
      JSON.stringify({
        version: 1,
        savedAt: now,
        data: {
          schemaVersion: 1,
          lastReconciledAt: now,
          journeys: [
            {
              id: readyId,
              schemaVersion: 1,
              sourceType: 'manual',
              titleZh: '国际团队舞台彩排确认',
              titleEn: 'StageRehearsalWithAlexandriaMontgomeryInternationalTeam',
              dayStartsAt: new Date().setHours(0, 0, 0, 0),
              scheduledStartsAt: now + 60 * 60_000,
              scheduledEndsAt: now + 2 * 60 * 60_000,
              allDay: false,
              requirement: 'required',
              locationRef,
              status: 'active',
              steps: [
                buildStep({
                  journeyId: readyId,
                  kind: 'travel',
                  sequence: 0,
                  status: 'completed',
                  titleZh: '前往 SM 娱乐总部',
                  titleEn: 'Travel to SM Entertainment HQ',
                  mapJourneyId: 'map_journey_e2e_arrived',
                }),
                buildStep({
                  journeyId: readyId,
                  kind: 'activity',
                  sequence: 1,
                  status: 'available',
                  titleZh: '国际团队舞台彩排确认',
                  titleEn: 'StageRehearsalWithAlexandriaMontgomeryInternationalTeam',
                }),
              ],
              startedAt: now - 30 * 60_000,
              completedAt: 0,
              createdAt: now - 60 * 60_000,
              updatedAt: now,
            },
            {
              id: departureId,
              schemaVersion: 1,
              sourceType: 'manual',
              titleZh: '前往录音室会面',
              titleEn: 'Travel to the studio meeting',
              dayStartsAt: new Date().setHours(0, 0, 0, 0),
              scheduledStartsAt: now + 3 * 60 * 60_000,
              scheduledEndsAt: now + 4 * 60 * 60_000,
              allDay: false,
              requirement: 'required',
              locationRef,
              status: 'planned',
              steps: [
                buildStep({
                  journeyId: departureId,
                  kind: 'travel',
                  sequence: 0,
                  status: 'available',
                  titleZh: '前往 SM 娱乐总部',
                  titleEn: 'Travel to SM Entertainment HQ',
                }),
                buildStep({
                  journeyId: departureId,
                  kind: 'activity',
                  sequence: 1,
                  status: 'planned',
                  titleZh: '前往录音室会面',
                  titleEn: 'Travel to the studio meeting',
                }),
              ],
              startedAt: 0,
              completedAt: 0,
              createdAt: now,
              updatedAt: now,
            },
          ],
        },
      }),
    )
  })
}

const expectNoHorizontalOverflow = async (page) => {
  const overflow = await page.evaluate(() => {
    const target = document.querySelector('[data-testid="agenda-journey-view"]')
    return {
      document: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      body: document.body.scrollWidth - document.body.clientWidth,
      target: target instanceof HTMLElement ? target.scrollWidth - target.clientWidth : 0,
    }
  })
  expect(overflow.document, 'document should not overflow horizontally').toBeLessThanOrEqual(1)
  expect(overflow.body, 'body should not overflow horizontally').toBeLessThanOrEqual(1)
  expect(overflow.target, 'Agenda Journey should not overflow horizontally').toBeLessThanOrEqual(1)
}

const expectCriticalAccessibility = async (page) => {
  const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
  expect(result.violations.filter((violation) => violation.impact === 'critical')).toEqual([])
}

const captureEvidence = async (page, testInfo, name) => {
  await mkdir(evidenceDir, { recursive: true })
  const filename = `${testInfo.project.name}-${name}.png`
  const body = await page.screenshot({
    path: join(evidenceDir, filename),
    animations: 'disabled',
    fullPage: true,
  })
  await testInfo.attach(filename, { body, contentType: 'image/png' })
}

test('executes Agenda Journey explicitly and returns from one linked Map Journey', async ({
  page,
}, testInfo) => {
  test.setTimeout(60_000)
  const pageErrors = []
  page.on('pageerror', (error) => pageErrors.push(error.message))
  await mockOpenFreeMapStyle(page)
  await seedAgendaJourneys(page)
  await unlockToHome(page)
  await navigateInsideUnlockedApp(page, '/agenda-journey?from=home&homePage=2')

  await page.getByRole('tab', { name: /In progress/ }).click()
  const readyRow = page.getByRole('button', {
    name: /StageRehearsalWithAlexandriaMontgomeryInternationalTeam/,
  })
  await expect(readyRow).toBeVisible()
  await readyRow.click()
  await expect(page.getByTestId('agenda-journey-focus')).toBeVisible()
  await expect(page.getByTestId('agenda-travel-step')).toContainText(/Map arrival verified/)
  await expect(page.getByTestId('agenda-activity-step')).toContainText(/Ready/)
  await expectNoHorizontalOverflow(page)
  await expectCriticalAccessibility(page)
  await captureEvidence(page, testInfo, 'activity-ready')

  const startActivity = page.getByTestId('agenda-activity-start')
  expect(await startActivity.evaluate((element) => element.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44)
  await startActivity.click()
  await page.getByTestId('agenda-activity-complete').click()
  await expect(page.getByTestId('agenda-journey-focus')).toContainText(/was completed/)

  const allPlans = page.getByRole('button', { name: /All plans/ })
  if (await allPlans.isVisible()) await allPlans.click()
  const departureRow = page.getByRole('button', { name: /Travel to the studio meeting/ })
  await page.getByRole('tab', { name: /Upcoming/ }).click()
  if (!(await departureRow.isVisible())) {
    await page.getByRole('tab', { name: /Today/ }).click()
  }
  await expect(departureRow).toBeVisible()
  await departureRow.click()
  await expect(page.getByTestId('agenda-travel-step')).toContainText(/Estimated time/)
  await expectNoHorizontalOverflow(page)
  await captureEvidence(page, testInfo, 'departure-ready')

  await page.getByTestId('agenda-open-map').click()
  await expect(page).toHaveURL(/\/map\?source=agenda-journey&journeyId=aj::e2e::departure::\d+&homePage=2/)
  await expect(page.getByTestId('map-active-journey')).toBeVisible()
  await expect(page.getByTestId('map-go-home')).toHaveAttribute(
    'aria-label',
    /Back to Journey/,
  )
  await captureEvidence(page, testInfo, 'map-linked-journey')

  await page.getByTestId('map-go-home').click()
  await expect(page).toHaveURL(/\/agenda-journey\?journeyId=aj::e2e::departure::\d+&from=home&homePage=2/)
  await expect(page.getByTestId('agenda-journey-focus')).toContainText(/Open Map Journey/)
  await expectNoHorizontalOverflow(page)
  expect(pageErrors).toEqual([])
})
