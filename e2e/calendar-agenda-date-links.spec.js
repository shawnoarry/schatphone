import { expect, test } from '@playwright/test'
import { navigateInsideUnlockedApp, unlockToHome } from './helpers/navigation.js'

const seed = async (page) => {
  await page.addInitScript(() => {
    const now = Date.now()
    window.localStorage.setItem(
      'schatphone:store:system',
      JSON.stringify({
        version: 1,
        savedAt: now,
        data: {
          settings: {
            system: { language: 'zh-CN', notifications: false },
            appearance: { currentTheme: 'default', wallpaperMode: 'theme' },
          },
        },
      }),
    )
    const dayStart = new Date(now)
    dayStart.setHours(0, 0, 0, 0)
    window.localStorage.setItem(
      'schatphone:store:calendar',
      JSON.stringify({
        version: 3,
        savedAt: now,
        data: {
          events: [
            {
              id: 'calendar_event_link_demo',
              source: 'manual',
              titleZh: '组内讨论',
              titleEn: 'Team sync',
              startsAt: dayStart.getTime() + 14 * 60 * 60_000,
              endsAt: dayStart.getTime() + 15 * 60 * 60_000,
              originalStartsAt: dayStart.getTime() + 14 * 60 * 60_000,
              originalEndsAt: dayStart.getTime() + 15 * 60 * 60_000,
              allDay: false,
              recurrence: 'none',
              recurrenceUntil: 0,
              requirement: 'required',
              reminderLeadMinutes: 0,
              status: 'confirmed',
              icon: 'fas fa-calendar-day',
              createdAt: now,
              updatedAt: now,
            },
          ],
        },
      }),
    )
  })
}

test('calendar and agenda journey cross-link by date', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await seed(page)
  await unlockToHome(page)
  await navigateInsideUnlockedApp(page, '/calendar')
  await page.waitForTimeout(400)

  await page.getByTestId('calendar-open-agenda-journey').click()
  await expect(page).toHaveURL(/\/agenda-journey\?.*source=calendar.*date=/)
  await expect(page.getByTestId('agenda-journey-view')).toBeVisible()

  await page.getByTestId('agenda-open-calendar').click()
  await expect(page).toHaveURL(/\/calendar\?.*source=agenda-journey.*date=/)
  await expect(page.getByTestId('calendar-page')).toBeVisible()
  await expect(page.locator('[data-testid^="calendar-event-row-"]').first()).toContainText('组内讨论')
})
