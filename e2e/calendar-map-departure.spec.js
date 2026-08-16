import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, test } from '@playwright/test'
import { navigateInsideUnlockedApp, unlockToHome } from './helpers/navigation.js'

const eventId = 'calendar_event_supermarket_to_studio'
const evidenceDir = fileURLToPath(
  new URL('../output/e2e/calendar-map-departure/', import.meta.url),
)
const deterministicStyle = {
  version: 8,
  name: 'SchatPhone deterministic map style',
  sources: {},
  layers: [
    {
      id: 'background',
      type: 'background',
      paint: { 'background-color': '#dbe5df' },
    },
  ],
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

const seedLocationBoundAppointment = async (page) => {
  await page.addInitScript(({ calendarEventId }) => {
    const seedKey = 'e2e:calendar-map-departure:seeded'
    if (window.localStorage.getItem(seedKey) === '1') return
    const now = Date.now()
    const startsAt = now + 12 * 60 * 1000
    const supermarket = {
      id: 9,
      label: '超市',
      detail: '首尔市麻浦区世界杯北路 410',
      category: 'shopping',
      mapPackId: 'real-seoul-v1',
      position: { kind: 'geo', lat: 37.581, lng: 126.888 },
    }
    window.localStorage.setItem(
      'schatphone:store:system',
      JSON.stringify({
        version: 1,
        savedAt: now,
        data: {
          settings: {
            system: { language: 'zh-CN', notifications: false, realPushEnabled: false },
          },
        },
      }),
    )
    window.localStorage.setItem(
      'schatphone:store:calendar',
      JSON.stringify({
        version: 2,
        savedAt: now,
        data: {
          events: [
            {
              id: calendarEventId,
              source: 'manual',
              titleZh: '工作室录音预约',
              titleEn: 'Studio recording appointment',
              summaryZh: '原计划从家出发，但现在角色正在超市。',
              summaryEn: 'The original plan assumed home, but the role is currently at a supermarket.',
              startsAt,
              originalStartsAt: startsAt,
              status: 'confirmed',
              pinned: true,
              icon: 'fas fa-microphone-lines',
              pushStatus: 'idle',
              locationRef: {
                owner: 'map',
                mapPackId: 'real-seoul-v1',
                placeId: 'seoul-sm-hq',
                labelZh: 'SM 娱乐总部',
                labelEn: 'SM Entertainment HQ',
              },
              createdAt: now,
              updatedAt: now,
            },
          ],
        },
      }),
    )
    window.localStorage.setItem(
      'schatphone:store:map',
      JSON.stringify({
        version: 4,
        savedAt: now,
        data: {
          activeMapPackId: 'real-seoul-v1',
          addresses: [supermarket],
          currentLocation: {
            source: 'saved',
            label: supermarket.label,
            detail: supermarket.detail,
            mapPackId: supermarket.mapPackId,
            placeId: `address:${supermarket.id}`,
            position: supermarket.position,
            positionEvidence: {
              provenance: 'manual',
              placeId: `address:${supermarket.id}`,
              evidenceAt: now,
              journeyId: '',
              journeyArrivedAt: 0,
            },
          },
          tripForm: {
            from: supermarket.detail,
            to: '',
            transportMode: '',
          },
        },
      }),
    )
    window.localStorage.setItem(seedKey, '1')
  }, { calendarEventId: eventId })
}

const expectNoHorizontalOverflow = async (page) => {
  const overflow = await page.evaluate(() => ({
    document: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    body: document.body.scrollWidth - document.body.clientWidth,
  }))
  expect(overflow.document).toBeLessThanOrEqual(1)
  expect(overflow.body).toBeLessThanOrEqual(1)
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

test('recalculates a location-bound appointment and starts one Map Journey explicitly', async ({
  page,
}, testInfo) => {
  test.setTimeout(45_000)
  await mockOpenFreeMapStyle(page)
  await seedLocationBoundAppointment(page)
  await unlockToHome(page)
  await navigateInsideUnlockedApp(page, '/calendar')

  const departure = page.getByTestId(`calendar-event-departure-${eventId}`)
  await expect(departure).toBeVisible()
  await expect(departure).toContainText('超市')
  await expect(departure).toContainText('SM 娱乐总部')
  await expect(page.getByTestId(`calendar-event-departure-status-${eventId}`)).toBeVisible()
  await expect(departure).toContainText(/预计迟到|About .* late/)

  const startButton = page.getByTestId(`calendar-event-start-travel-${eventId}`)
  expect(await startButton.evaluate((element) => element.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44)
  await startButton.focus()
  await expect(startButton).toBeFocused()
  await expectNoHorizontalOverflow(page)

  await page.getByTestId(`calendar-event-departure-expand-${eventId}`).click()
  const modeSelect = page.getByTestId(`calendar-event-departure-mode-${eventId}`)
  const publicTransitText = await departure.textContent()
  await modeSelect.selectOption('walk')
  await expect(modeSelect).toHaveValue('walk')
  await expect.poll(() => departure.textContent()).not.toBe(publicTransitText)

  await captureEvidence(page, testInfo, 'calendar-departure')
  await startButton.click()

  await expect(page).toHaveURL(new RegExp(`/map\\?source=calendar&calendarEventId=${eventId}`))
  await expect(page.getByTestId('map-active-journey')).toBeVisible()
  await expect(page.getByTestId('map-active-journey')).toContainText(/行程中|In transit/)
  await expect(page.getByTestId('map-primary-route-card')).toContainText('超市')
  await expect(page.getByTestId('map-primary-route-card')).toContainText('SM 娱乐总部')
  await expect(page.getByTestId('map-go-home')).toHaveAttribute(
    'aria-label',
    /返回日历|Back to Calendar/,
  )
  await expectNoHorizontalOverflow(page)
  await captureEvidence(page, testInfo, 'map-active-journey')

  await page.getByTestId('map-go-home').click()
  await expect(page).toHaveURL(/\/calendar$/)
  await expect(page.getByTestId(`calendar-event-open-journey-${eventId}`)).toBeVisible()
  await expect(page.getByTestId(`calendar-event-start-travel-${eventId}`)).toHaveCount(0)
})
