import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { navigateInsideUnlockedApp, unlockToHome } from './helpers/navigation.js'

const themes = ['default', 'zen']
const eventId = 'calendar_event_cja1_long_title'
const longEventTitle =
  'Planning session with AlexandriaMontgomeryInternationalScheduleWithoutBreaks'
const evidenceDir = fileURLToPath(new URL('../output/e2e/calendar-cja1/', import.meta.url))

const seedCalendar = async (page, theme) => {
  await page.addInitScript(
    ({ currentTheme, calendarEventId, eventTitle }) => {
      const now = Date.now()
      const startsAt = now + 2 * 60 * 60_000
      const today = new Date(now)
      today.setHours(0, 0, 0, 0)
      const multiDayStartsAt = today.getTime()
      const multiDayEndsAt = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate() + 3,
      ).getTime()
      window.localStorage.setItem(
        'schatphone:store:system',
        JSON.stringify({
          version: 1,
          savedAt: now,
          data: {
            settings: {
              system: {
                language: 'en-US',
                notifications: false,
              },
              appearance: {
                currentTheme,
                wallpaperMode: 'theme',
              },
            },
          },
        }),
      )
      window.localStorage.setItem(
        'schatphone:store:calendar',
        JSON.stringify({
          version: 3,
          savedAt: now,
          data: {
            events: [
              {
                id: calendarEventId,
                source: 'manual',
                titleZh: eventTitle,
                titleEn: eventTitle,
                summaryZh:
                  'Review the release schedule, ownership handoffs, and the final delivery window.',
                summaryEn:
                  'Review the release schedule, ownership handoffs, and the final delivery window.',
                notesZh: 'Bring the revised cue sheet and confirm the arrival window.',
                notesEn: 'Bring the revised cue sheet and confirm the arrival window.',
                startsAt,
                endsAt: startsAt + 90 * 60_000,
                originalStartsAt: startsAt,
                originalEndsAt: startsAt + 90 * 60_000,
                allDay: false,
                recurrence: 'weekly',
                recurrenceUntil: startsAt + 28 * 24 * 60 * 60_000,
                requirement: 'required',
                reminderLeadMinutes: 30,
                status: 'confirmed',
                pinned: true,
                icon: 'fas fa-calendar-day',
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
              {
                id: 'calendar_event_cja1_multiday',
                source: 'manual',
                titleZh: '巡演准备期',
                titleEn: 'Tour preparation block',
                startsAt: multiDayStartsAt,
                endsAt: multiDayEndsAt,
                originalStartsAt: multiDayStartsAt,
                originalEndsAt: multiDayEndsAt,
                allDay: true,
                recurrence: 'none',
                recurrenceUntil: 0,
                requirement: 'optional',
                reminderLeadMinutes: 1440,
                status: 'confirmed',
                icon: 'fas fa-suitcase-rolling',
                pushStatus: 'idle',
                createdAt: now,
                updatedAt: now,
              },
            ],
          },
        }),
      )
      window.localStorage.setItem(
        'schatphone:store:reminders',
        JSON.stringify({
          version: 1,
          savedAt: now,
          data: {
            phoneMissedCallCues: [
              {
                id: 'phone_missed_call_cue_calendar_boundary',
                callId: 'call_calendar_boundary',
                contactName: 'Mina',
                summary: 'Call back after the planning session.',
                suggestedAt: now + 45 * 60_000,
                status: 'suggested',
                route: '/phone',
                createdAt: now,
                updatedAt: now,
              },
            ],
            shoppingDeliveryCues: [],
            stockMarketCues: [],
          },
        }),
      )
    },
    { currentTheme: theme, calendarEventId: eventId, eventTitle: longEventTitle },
  )
}

const expectNoHorizontalOverflow = async (page) => {
  const overflow = await page.evaluate(() => ({
    document: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    body: document.body.scrollWidth - document.body.clientWidth,
  }))
  expect(overflow.document, 'document should not overflow horizontally').toBeLessThanOrEqual(1)
  expect(overflow.body, 'body should not overflow horizontally').toBeLessThanOrEqual(1)
}

const expectNoCriticalAxeViolations = async (page) => {
  const accessibility = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze()
  const criticalViolations = accessibility.violations.filter(
    (violation) => violation.impact === 'critical',
  )
  expect(criticalViolations).toEqual([])
}

const expectScheduleBeforeReminders = async (page) => {
  const [scheduleBox, remindersBox] = await Promise.all([
    page.getByTestId('calendar-confirmed-events').boundingBox(),
    page.getByTestId('calendar-reminder-summary').boundingBox(),
  ])
  expect(scheduleBox).not.toBeNull()
  expect(remindersBox).not.toBeNull()
  expect(scheduleBox.y).toBeLessThan(remindersBox.y)
}

const expectWorkspaceBeforeOverview = async (page) => {
  const [workspaceBox, overviewBox] = await Promise.all([
    page.getByTestId('calendar-confirmed-events').boundingBox(),
    page.getByTestId('calendar-schedule-overview').boundingBox(),
  ])
  expect(workspaceBox).not.toBeNull()
  expect(overviewBox).not.toBeNull()
  expect(workspaceBox.y).toBeLessThan(overviewBox.y)
}

const expectReadableMobileAgenda = async (page) => {
  if ((page.viewportSize()?.width || 0) > 760) return
  const layout = await page.locator('.calendar-agenda-day').first().evaluate((day) => {
    const date = day.querySelector('.calendar-agenda-day__date').getBoundingClientRect()
    const events = day.querySelector('.calendar-agenda-day__events').getBoundingClientRect()
    const firstEvent = day.querySelector('.calendar-agenda-event')
    const time = firstEvent.querySelector('.calendar-agenda-event__time').getBoundingClientRect()
    const copy = firstEvent.querySelector('.calendar-agenda-event__copy').getBoundingClientRect()
    return {
      dateBottom: date.bottom,
      eventsTop: events.top,
      timeTop: time.top,
      copyTop: copy.top,
      eventWidth: firstEvent.getBoundingClientRect().width,
      eventsWidth: events.width,
    }
  })
  expect(layout.dateBottom).toBeLessThanOrEqual(layout.eventsTop + 1)
  expect(layout.timeTop).toBeLessThan(layout.copyTop)
  expect(layout.eventWidth).toBeGreaterThanOrEqual(layout.eventsWidth - 1)
}

const captureEvidence = async (page, testInfo, name, options = {}) => {
  await mkdir(evidenceDir, { recursive: true })
  const filename = `${testInfo.project.name}-${name}.png`
  const body = await page.screenshot({
    path: join(evidenceDir, filename),
    animations: 'disabled',
    fullPage: options.fullPage !== false,
  })
  await testInfo.attach(filename, { body, contentType: 'image/png' })
}

for (const theme of themes) {
  test(`${theme} Calendar completes month/week/Agenda authoring without overflow`, async ({
    page,
  }, testInfo) => {
    test.setTimeout(60_000)
    const pageErrors = []
    page.on('pageerror', (error) => pageErrors.push(error.message))

    await page.emulateMedia({ reducedMotion: 'reduce' })
    await seedCalendar(page, theme)
    await unlockToHome(page)
    await navigateInsideUnlockedApp(page, '/calendar')

    await expect(page.locator('.app-shell')).toHaveAttribute('data-theme', theme)
    await expect(page.getByRole('heading', { name: 'Calendar', level: 1 })).toBeVisible()
    await expect(page.getByTestId('calendar-month-view')).toBeVisible()
    await expect(page.getByTestId('calendar-reminder-source-phone')).toContainText('1')
    await expectWorkspaceBeforeOverview(page)
    await expectScheduleBeforeReminders(page)

    await page.locator(`[data-testid^="calendar-month-event-${eventId}::"]`).first().click()
    const eventCard = page.getByTestId(`calendar-event-card-${eventId}`)
    await expect(eventCard).toBeVisible()
    await expect(eventCard).toContainText(longEventTitle)
    await expect(eventCard).toContainText('Repeats weekly')
    await expect(eventCard).toContainText('30 minutes before')
    await expect(page.getByTestId(`calendar-event-departure-${eventId}`)).toBeVisible()
    await expectNoHorizontalOverflow(page)
    await expectNoCriticalAxeViolations(page)
    await captureEvidence(page, testInfo, `calendar-month-${theme}`)

    const createButton = page.getByTestId('calendar-create-event')
    await createButton.focus()
    await expect(createButton).toBeFocused()
    expect(await createButton.evaluate((element) => element.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44)
    await createButton.click()

    const editor = page.getByTestId('calendar-event-editor')
    await expect(editor).toBeVisible()
    await page.getByTestId('calendar-editor-title-zh').fill('媒体沟通会')
    await page.getByTestId('calendar-editor-title-en').fill('Press briefing')
    await page.getByTestId('calendar-editor-recurrence').selectOption('monthly')
    await page.getByTestId('calendar-editor-reminder-lead').selectOption('60')
    await page.getByTestId('calendar-editor-place-search').fill('SM')
    await page.getByTestId('calendar-editor-place-seoul-sm-hq').click()
    await expect(page.getByTestId('calendar-editor-selected-place')).toContainText(
      'SM Entertainment HQ',
    )
    await expectNoHorizontalOverflow(page)
    await expectNoCriticalAxeViolations(page)
    await captureEvidence(page, testInfo, `calendar-editor-${theme}`, { fullPage: false })
    await page.getByTestId('calendar-editor-save').click()

    const createdCard = page.locator('[data-testid^="calendar-event-card-"]').filter({
      hasText: 'Press briefing',
    })
    await expect(createdCard).toBeVisible()
    await expect(createdCard).toContainText('Repeats monthly')
    await expect(createdCard).toContainText('1 hour before')
    await expect(createdCard).toContainText('SM Entertainment HQ')

    await page.getByTestId('calendar-edit-selected-event').click()
    await page.getByTestId('calendar-editor-title-en').fill('Press briefing revised')
    await page.getByTestId('calendar-editor-notes-en').fill(
      'Confirm the revised press list before arrival.',
    )
    await page.getByTestId('calendar-editor-save').click()
    await expect(page.getByTestId('calendar-selected-event-detail')).toContainText(
      'Press briefing revised',
    )
    await expect(page.getByTestId('calendar-selected-event-detail')).toContainText(
      'Confirm the revised press list before arrival.',
    )

    await page.getByTestId('calendar-view-week').click()
    await expect(page.getByTestId('calendar-week-view')).toBeVisible()
    await expect(page.getByTestId('calendar-week-view')).toContainText('Press briefing revised')
    await expectNoHorizontalOverflow(page)

    await page.getByTestId('calendar-view-agenda').click()
    await expect(page.getByTestId('calendar-agenda-view')).toBeVisible()
    await expect(page.getByTestId('calendar-agenda-view')).toContainText('Press briefing revised')
    await expect(page.getByTestId('calendar-agenda-view')).toContainText('Tour preparation block')
    await expectReadableMobileAgenda(page)
    await expectNoCriticalAxeViolations(page)
    await expectNoHorizontalOverflow(page)
    await captureEvidence(page, testInfo, `calendar-agenda-${theme}`)

    const createdCardTestId = await createdCard.getAttribute('data-testid')
    const createdEventId = createdCardTestId.replace('calendar-event-card-', '')
    await page.getByTestId(`calendar-event-delete-${createdEventId}`).click()
    await expect(page.getByText('Press briefing revised', { exact: true })).toHaveCount(0)
    await page.getByTestId('calendar-view-month').click()
    await page.locator(`[data-testid^="calendar-month-event-${eventId}::"]`).first().click()
    await expect(page.getByTestId(`calendar-event-card-${eventId}`)).toBeVisible()

    expect(pageErrors).toEqual([])
  })
}

test('Calendar marker colors follow an event and persist durably', async ({ page }) => {
  const pageErrors = []
  page.on('pageerror', (error) => pageErrors.push(error.message))
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await seedCalendar(page, 'default')
  await unlockToHome(page)
  await navigateInsideUnlockedApp(page, '/calendar')

  await page.locator(`[data-testid^="calendar-month-event-${eventId}::"]`).first().click()
  await page.getByTestId('calendar-edit-selected-event').click()
  await page.getByTestId('calendar-editor-marker-marker_anniversary').click()
  await page.getByTestId('calendar-editor-save').click()
  await expect(page.getByTestId('calendar-event-editor')).toHaveCount(0)

  // the marker write lands in a deferred mirror; poll the persisted record instead of
  // assuming the hot localStorage value is already fresh
  const readPersistedMarker = () =>
    page.evaluate(() => {
      const raw = window.localStorage.getItem('schatphone:store:calendar')
      const events = raw ? JSON.parse(raw)?.data?.events || [] : []
      return events.find((event) => event.id === 'calendar_event_cja1_long_title')?.markerId || ''
    })
  await expect.poll(readPersistedMarker).toBe('marker_anniversary')

  await expect(page.locator('.calendar-month-event.has-marker').first()).toBeVisible()
  await page.getByTestId('calendar-view-agenda').click()
  await expect(page.getByTestId('calendar-agenda-view')).toContainText('Anniversary')

  expect(pageErrors).toEqual([])
})
