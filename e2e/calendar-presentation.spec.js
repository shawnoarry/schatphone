import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { navigateInsideUnlockedApp, unlockToHome } from './helpers/navigation.js'

const themes = ['default', 'zen']
const eventId = 'calendar_event_visual_long_title'
const longEventTitle =
  'Planning session with AlexandriaMontgomeryInternationalScheduleWithoutBreaks'

const seedCalendar = async (page, theme) => {
  await page.addInitScript(
    ({ currentTheme, calendarEventId, eventTitle }) => {
      const now = Date.UTC(2026, 6, 21, 8, 0, 0)
      const startsAt = now + 2 * 60 * 60 * 1000
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
          version: 1,
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
                startsAt,
                originalStartsAt: startsAt,
                status: 'confirmed',
                pinned: true,
                icon: 'fas fa-calendar-day',
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
                suggestedAt: now + 45 * 60 * 1000,
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

const expectScheduleBeforeReminders = async (page, scheduleTestId) => {
  const schedule = page.getByTestId(scheduleTestId)
  const reminders = page.getByTestId('calendar-reminder-summary')
  const [scheduleBox, remindersBox] = await Promise.all([
    schedule.boundingBox(),
    reminders.boundingBox(),
  ])

  expect(scheduleBox).not.toBeNull()
  expect(remindersBox).not.toBeNull()
  expect(scheduleBox.y, 'confirmed schedule should precede the Reminders boundary').toBeLessThan(
    remindersBox.y,
  )
}

const expectVisibleFocus = async (locator) => {
  await expect(locator).toBeFocused()
  const focusStyle = await locator.evaluate((element) => {
    const style = window.getComputedStyle(element)
    return {
      outlineStyle: style.outlineStyle,
      outlineWidth: Number.parseFloat(style.outlineWidth),
    }
  })

  expect(focusStyle.outlineStyle).not.toBe('none')
  expect(focusStyle.outlineWidth).toBeGreaterThanOrEqual(2)
}

const rectanglesOverlap = (first, second) =>
  first.left < second.right &&
  first.right > second.left &&
  first.top < second.bottom &&
  first.bottom > second.top

for (const theme of themes) {
  test(`${theme} Calendar keeps confirmed schedules first through edit and empty states`, async ({
    page,
  }, testInfo) => {
    const pageErrors = []
    page.on('pageerror', (error) => pageErrors.push(error.message))

    await page.emulateMedia({ reducedMotion: 'reduce' })
    await seedCalendar(page, theme)
    await unlockToHome(page)
    await navigateInsideUnlockedApp(page, '/calendar')

    await expect(page.locator('.app-shell')).toHaveAttribute('data-theme', theme)
    await expect(page.getByRole('heading', { name: 'Calendar', level: 1 })).toBeVisible()
    await expectScheduleBeforeReminders(page, 'calendar-confirmed-events')
    await expect(page.getByTestId('calendar-reminder-source-phone')).toContainText('1')
    await expectNoHorizontalOverflow(page)

    const eventCard = page.getByTestId(`calendar-event-card-${eventId}`)
    const eventTitle = eventCard.locator('.calendar-event-card__title')
    const headerActions = eventCard.locator('.calendar-event-card__header-actions')
    await expect(eventCard).toBeVisible()
    await expect(eventTitle).toContainText(longEventTitle)
    await expect(eventCard).toContainText('Not ready')

    const eventLayout = await eventCard.evaluate((element) => {
      const toRect = (bounds) => ({
        top: bounds.top,
        right: bounds.right,
        bottom: bounds.bottom,
        left: bounds.left,
      })
      const title = element.querySelector('.calendar-event-card__title')
      const titleStyle = window.getComputedStyle(title)
      const titleRange = document.createRange()
      titleRange.selectNodeContents(title)
      return {
        title: toRect(title.getBoundingClientRect()),
        actions: toRect(
          element.querySelector('.calendar-event-card__header-actions').getBoundingClientRect(),
        ),
        titleClientWidth: title.clientWidth,
        titleScrollWidth: title.scrollWidth,
        titleHeight: title.getBoundingClientRect().height,
        titleLineHeight: Number.parseFloat(titleStyle.lineHeight),
        titleLineCount: [...titleRange.getClientRects()].filter(
          (bounds) => bounds.width > 0 && bounds.height > 0,
        ).length,
      }
    })
    expect(eventLayout.titleScrollWidth).toBeLessThanOrEqual(eventLayout.titleClientWidth + 1)
    expect(rectanglesOverlap(eventLayout.title, eventLayout.actions)).toBe(false)
    if (testInfo.project.name === 'mobile-chrome') {
      expect(eventLayout.titleLineCount, 'long event title should wrap on mobile').toBeGreaterThan(
        1,
      )
      expect(eventLayout.titleHeight).toBeGreaterThan(eventLayout.titleLineHeight)
    }
    await expect(headerActions).toContainText('Pinned')

    for (const button of await page.locator('.calendar-page button').all()) {
      await expect(button).toHaveAttribute('type', 'button')
    }

    const shiftButton = page.getByTestId(`calendar-event-shift-${eventId}-plus_hour`)
    let shiftButtonFocused = false
    for (let index = 0; index < 10 && !shiftButtonFocused; index += 1) {
      await page.keyboard.press('Tab')
      shiftButtonFocused = await shiftButton.evaluate(
        (element) => document.activeElement === element,
      )
    }
    expect(shiftButtonFocused, 'time shift should be keyboard reachable').toBe(true)
    await expectVisibleFocus(shiftButton)
    const shiftHeight = await shiftButton.evaluate(
      (element) => element.getBoundingClientRect().height,
    )
    expect(shiftHeight, 'time shift should retain a touch-sized target').toBeGreaterThanOrEqual(44)

    await expectNoCriticalAxeViolations(page)
    await testInfo.attach(`calendar-populated-${theme}.png`, {
      body: await page.screenshot({ animations: 'disabled' }),
      contentType: 'image/png',
    })
    await testInfo.attach(`calendar-long-event-${theme}.png`, {
      body: await eventCard.screenshot({ animations: 'disabled' }),
      contentType: 'image/png',
    })

    const timeInput = page.getByTestId(`calendar-event-time-${eventId}`)
    const originalTime = await timeInput.inputValue()
    await shiftButton.click()
    await expect(page.getByTestId(`calendar-event-time-feedback-${eventId}`)).toContainText(
      'Adjusted',
    )
    await expect(timeInput).not.toHaveValue(originalTime)
    await testInfo.attach(`calendar-adjusted-${theme}.png`, {
      body: await eventCard.screenshot({ animations: 'disabled' }),
      contentType: 'image/png',
    })

    await page.getByTestId(`calendar-event-reset-time-${eventId}`).click()
    await expect(timeInput).toHaveValue(originalTime)
    await expect(page.getByTestId(`calendar-event-time-feedback-${eventId}`)).toHaveCount(0)

    await page.getByTestId(`calendar-event-delete-${eventId}`).click()
    const emptySchedule = page.getByTestId('calendar-empty-events')
    await expect(emptySchedule).toContainText('No confirmed events yet')
    await expect(eventCard).toHaveCount(0)
    await expectScheduleBeforeReminders(page, 'calendar-empty-events')
    await expect(page.getByTestId('calendar-reminder-source-phone')).toContainText('1')
    await expectNoHorizontalOverflow(page)
    await expectNoCriticalAxeViolations(page)
    await testInfo.attach(`calendar-empty-${theme}.png`, {
      body: await page.screenshot({ animations: 'disabled' }),
      contentType: 'image/png',
    })

    expect(pageErrors).toEqual([])
  })
}
