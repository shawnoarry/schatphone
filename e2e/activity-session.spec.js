import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import {
  navigateInsideUnlockedApp,
  unlockToHome,
} from './helpers/navigation.js'

const evidenceDir = fileURLToPath(new URL('../output/e2e/activity-session-cja5/', import.meta.url))
const JOURNEY_ID = 'aj::e2e::activity-session'
const EVENT_JOURNEY_ID = 'aj::e2e::activity-session-event'

const seedActivityPlan = async (page) => {
  await page.addInitScript(({ journeyId }) => {
    const now = Date.now()
    if (!window.localStorage.getItem('schatphone:store:system')) {
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
    }
    if (!window.localStorage.getItem('schatphone:store:agenda-journey')) {
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
              id: journeyId,
              schemaVersion: 1,
              sourceType: 'manual',
              sourceCalendarEventId: '',
              titleZh: '国际声乐与舞台呼吸练习',
              titleEn: 'International vocal and stage breathing practice',
              dayStartsAt: new Date().setHours(0, 0, 0, 0),
              scheduledStartsAt: now,
              scheduledEndsAt: now + 60 * 60_000,
              allDay: false,
              requirement: 'required',
              locationRef: null,
              status: 'planned',
              steps: [
                {
                  id: `${journeyId}::activity`,
                  agendaJourneyId: journeyId,
                  sequence: 0,
                  kind: 'activity',
                  titleZh: '国际声乐与舞台呼吸练习',
                  titleEn: 'International vocal and stage breathing practice',
                  status: 'available',
                  requirement: 'required',
                  completionPolicy: 'user_confirmation',
                  scheduledStartsAt: now,
                  scheduledEndsAt: now + 60 * 60_000,
                  desiredArrivalAt: 0,
                  locationRef: null,
                  transportMode: 'public_transit',
                  mapJourneyId: '',
                  evidenceRefs: [],
                  startedAt: 0,
                  completedAt: 0,
                  updatedAt: now,
                },
              ],
              outcomeSummaryZh: '',
              outcomeSummaryEn: '',
              startedAt: 0,
              completedAt: 0,
              createdAt: now,
              updatedAt: now,
            },
          ],
        },
        }),
      )
    }
  }, { journeyId: JOURNEY_ID })
}

const seedActivityEventPlan = async (page) => {
  await page.addInitScript(({ journeyId }) => {
    const now = Date.now()
    const startedAt = now - 31 * 60_000
    const stepId = `${journeyId}::activity`
    const sessionId = `activity-session::${stepId}`
    if (!window.localStorage.getItem('schatphone:store:system')) {
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
    }
    if (!window.localStorage.getItem('schatphone:store:agenda-journey')) {
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
                id: journeyId,
                schemaVersion: 1,
                sourceType: 'manual',
                sourceCalendarEventId: '',
                titleZh: '舞台排练专注时段',
                titleEn: 'Stage rehearsal focus block',
                dayStartsAt: new Date().setHours(0, 0, 0, 0),
                scheduledStartsAt: startedAt,
                scheduledEndsAt: startedAt + 60 * 60_000,
                allDay: false,
                requirement: 'required',
                locationRef: null,
                status: 'active',
                steps: [
                  {
                    id: stepId,
                    agendaJourneyId: journeyId,
                    sequence: 0,
                    kind: 'activity',
                    titleZh: '舞台排练专注时段',
                    titleEn: 'Stage rehearsal focus block',
                    status: 'active',
                    requirement: 'required',
                    completionPolicy: 'duration_sufficient',
                    scheduledStartsAt: startedAt,
                    scheduledEndsAt: startedAt + 60 * 60_000,
                    desiredArrivalAt: 0,
                    locationRef: null,
                    transportMode: 'public_transit',
                    mapJourneyId: '',
                    evidenceRefs: [],
                    startedAt,
                    completedAt: 0,
                    updatedAt: startedAt,
                  },
                ],
                outcomeSummaryZh: '',
                outcomeSummaryEn: '',
                startedAt,
                completedAt: 0,
                createdAt: startedAt,
                updatedAt: startedAt,
              },
            ],
          },
        }),
      )
    }
    if (!window.localStorage.getItem('schatphone:store:activity-session')) {
      window.localStorage.setItem(
        'schatphone:store:activity-session',
        JSON.stringify({
          version: 2,
          savedAt: now,
          data: {
            schemaVersion: 2,
            lastReconciledAt: startedAt,
            sessions: [
              {
                id: sessionId,
                schemaVersion: 2,
                agendaJourneyId: journeyId,
                agendaJourneyStepId: stepId,
                sourceCalendarEventId: '',
                sourceMapJourneyId: '',
                plannedDurationMs: 60 * 60_000,
                completionPolicy: 'duration_sufficient',
                pausePolicy: 'allow_pause',
                status: 'running',
                startedAt,
                accumulatedPausedMs: 0,
                processedCheckpointIds: [],
                eventResolutions: [],
                ownerCompletionAcknowledgedAt: 0,
                presentation: { minimized: false, sceneId: 'quiet_horizon' },
                createdAt: startedAt,
                updatedAt: startedAt,
              },
            ],
          },
        }),
      )
    }
    if (!window.localStorage.getItem('schatphone:store:simulation')) {
      window.localStorage.setItem(
        'schatphone:store:simulation',
        JSON.stringify({
          version: 6,
          savedAt: now,
          data: {
            eventLogs: [],
            activitySessionEventRecords: [],
            cooldownsByEvent: {},
            dailyCounters: {},
            settings: {
              surpriseMode: 'high',
              enabledModules: { activity_session: true },
              foregroundSessionTickEnabled: false,
              foregroundSessionTickIntervalMs: 10 * 60_000,
              eventTextMode: 'local_only',
              eventPresentationModes: { activity_session: 'text' },
            },
          },
        }),
      )
    }
  }, { journeyId: EVENT_JOURNEY_ID })
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
  expect(overflow.document).toBeLessThanOrEqual(1)
  expect(overflow.body).toBeLessThanOrEqual(1)
  expect(overflow.target).toBeLessThanOrEqual(1)
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

const captureElementEvidence = async (locator, testInfo, name) => {
  await mkdir(evidenceDir, { recursive: true })
  const filename = `${testInfo.project.name}-${name}.png`
  const body = await locator.screenshot({
    path: join(evidenceDir, filename),
    animations: 'disabled',
  })
  await testInfo.attach(filename, { body, contentType: 'image/png' })
}

test('keeps one Activity Session through pause, minimize, navigation, and reopen', async ({
  page,
}, testInfo) => {
  const pageErrors = []
  page.on('pageerror', (error) => pageErrors.push(error.message))
  await seedActivityPlan(page)
  await unlockToHome(page)
  await navigateInsideUnlockedApp(
    page,
    `/agenda-journey?journeyId=${encodeURIComponent(JOURNEY_ID)}&from=home&homePage=2`,
  )

  await page.getByTestId('activity-session-completion-policy').selectOption('user_confirmation')
  await page.getByTestId('activity-session-pause-policy').selectOption('allow_pause')
  const startButton = page.getByTestId('agenda-activity-start')
  expect(await startButton.evaluate((element) => element.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44)
  await startButton.click()

  const companion = page.getByTestId('activity-focus-companion')
  await expect(companion).toBeVisible()
  await expect(companion).toContainText(/Focusing/)
  await expect(page.getByTestId('activity-session-remaining')).toHaveText(/\d{2}:\d{2}/)
  await expectNoHorizontalOverflow(page)
  const accessibility = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze()
  expect(accessibility.violations.filter((violation) => violation.impact === 'critical')).toEqual([])
  await captureEvidence(page, testInfo, 'focus-running')

  await page.getByTestId('activity-session-pause').click()
  await expect(companion).toContainText(/Paused/)
  await page.getByTestId('activity-session-resume').click()
  await expect(companion).toContainText(/Focusing/)
  await page.getByTestId('activity-session-minimize').click()
  await expect(page.getByTestId('activity-session-expand')).toBeVisible()
  await captureEvidence(page, testInfo, 'focus-minimized')

  await navigateInsideUnlockedApp(page, '/home')
  await navigateInsideUnlockedApp(
    page,
    `/agenda-journey?journeyId=${encodeURIComponent(JOURNEY_ID)}&from=home&homePage=2`,
  )
  await expect(page.getByTestId('activity-session-expand')).toBeVisible()

  await page.reload()
  await unlockToHome(page)
  await navigateInsideUnlockedApp(
    page,
    `/agenda-journey?journeyId=${encodeURIComponent(JOURNEY_ID)}&from=home&homePage=2`,
  )
  await expect(page.getByTestId('activity-session-expand')).toBeVisible()
  await page.getByTestId('activity-session-expand').click()
  await expect(page.getByTestId('agenda-activity-complete')).toBeVisible()
  await page.getByTestId('agenda-activity-complete').click()
  await expect(page.getByTestId('agenda-journey-focus')).toContainText(/was completed/)
  await expect(page.getByTestId('activity-focus-companion')).toContainText(/Completed/)
  await expectNoHorizontalOverflow(page)
  await captureEvidence(page, testInfo, 'focus-completed')
  expect(pageErrors).toEqual([])
})

test('resolves one midpoint text event inside Focus Companion without blocking the activity', async ({
  page,
}, testInfo) => {
  const pageErrors = []
  page.on('pageerror', (error) => pageErrors.push(error.message))
  await seedActivityEventPlan(page)
  await unlockToHome(page)
  await navigateInsideUnlockedApp(
    page,
    `/agenda-journey?journeyId=${encodeURIComponent(EVENT_JOURNEY_ID)}&from=home&homePage=2`,
  )

  const eventSurface = page.getByTestId('activity-session-event-text')
  await expect(eventSurface).toBeVisible()
  await expect(eventSurface).toContainText(/Add a short recovery buffer/)
  const addBuffer = page.getByTestId('activity-session-event-add-buffer')
  expect(await addBuffer.evaluate((element) => element.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44)
  await expectNoHorizontalOverflow(page)
  const accessibility = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze()
  expect(accessibility.violations.filter((violation) => violation.impact === 'critical')).toEqual([])
  await captureEvidence(page, testInfo, 'event-text-pending')
  await captureElementEvidence(eventSurface, testInfo, 'event-text-surface')

  await addBuffer.click()
  await expect(eventSurface).toBeHidden()
  await expect(page.getByTestId('agenda-journey-view')).toContainText(/two-minute recovery buffer was added/i)
  await expect.poll(async () =>
    page.evaluate(() => {
      const envelope = JSON.parse(
        window.localStorage.getItem('schatphone:store:activity-session') || 'null',
      )
      return envelope?.data?.sessions?.[0]?.eventDurationAdjustmentMs || 0
    }),
  ).toBe(2 * 60_000)
  await expect.poll(async () =>
    page.evaluate(() => {
      const envelope = JSON.parse(
        window.localStorage.getItem('schatphone:store:simulation') || 'null',
      )
      return envelope?.data?.activitySessionEventRecords?.[0]?.status || ''
    }),
  ).toBe('resolved')
  await expectNoHorizontalOverflow(page)
  await captureEvidence(page, testInfo, 'event-text-resolved')

  await page.reload()
  await unlockToHome(page)
  await navigateInsideUnlockedApp(
    page,
    `/agenda-journey?journeyId=${encodeURIComponent(EVENT_JOURNEY_ID)}&from=home&homePage=2`,
  )
  await expect(page.getByTestId('activity-session-event-text')).toHaveCount(0)
  await expect(page.getByTestId('activity-focus-companion')).toBeVisible()
  expect(pageErrors).toEqual([])
})
