import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { navigateInsideUnlockedApp, unlockToHome, waitForHashRoute } from './helpers/navigation.js'

test.use({
  trace: 'off',
  screenshot: 'only-on-failure',
  video: 'off',
})

const evidenceDir = fileURLToPath(
  new URL('../output/e2e/system-notification-shade/', import.meta.url),
)

const seedNotificationShade = async (page) => {
  await page.addInitScript(() => {
    if (window.localStorage.getItem('notification-shade-seeded') === '1') return
    const now = Date.now()
    window.localStorage.setItem(
      'schatphone:store:system',
      JSON.stringify({
        version: 1,
        savedAt: now,
        data: {
          settings: {
            system: {
              language: 'zh-CN',
              notifications: true,
              realPushEnabled: false,
            },
            appearance: {
              currentTheme: 'default',
              colorMode: 'day',
              systemTheme: 'cloud-pastel',
              wallpaperMode: 'theme',
            },
          },
          notifications: [
            {
              id: 'calendar-ready',
              title: '彩排还有 45 分钟',
              content: '从当前位置出发，建议 18:20 前离开。',
              icon: 'fas fa-calendar-days',
              route: '/calendar',
              source: 'calendar_departure_ready',
              createdAt: now,
              read: false,
            },
            {
              id: 'map-estimate',
              title: '建议 18:20 出发',
              content: '当前路线预计 25 分钟，交通状况正常。',
              icon: 'fas fa-map-location-dot',
              route: '/map',
              source: 'map_departure_estimate',
              createdAt: now - 60_000,
              read: false,
            },
            {
              id: 'mail-arrival',
              title: '你收到一封新邮件',
              content: 'Anna 发来了新的工作安排，请查收。',
              icon: 'fas fa-envelope-open-text',
              route: '/mail',
              source: 'mail_arrival',
              createdAt: now - 120_000,
              read: true,
            },
          ],
        },
      }),
    )
    window.localStorage.setItem('notification-shade-calendar-sentinel', 'calendar-owner-unchanged')
    window.localStorage.setItem('notification-shade-seeded', '1')
  })
}

const expectNoHorizontalOverflow = async (page) => {
  const overflow = await page.evaluate(() => ({
    document: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    body: document.body.scrollWidth - document.body.clientWidth,
    shade: (() => {
      const element = document.querySelector('[data-testid="notification-shade"]')
      return element ? element.scrollWidth - element.clientWidth : 0
    })(),
  }))
  expect(overflow.document).toBeLessThanOrEqual(1)
  expect(overflow.body).toBeLessThanOrEqual(1)
  expect(overflow.shade).toBeLessThanOrEqual(1)
}

test.beforeEach(async ({ page }) => {
  await seedNotificationShade(page)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await unlockToHome(page)
})

test('unlocked notification shade groups owner records and supports ordinary handling', async ({
  page,
}, testInfo) => {
  const pageErrors = []
  page.on('pageerror', (error) => pageErrors.push(error.message))

  await page.getByTestId('notification-shade-trigger').click()
  const shade = page.getByTestId('notification-shade')
  await expect(shade).toBeVisible()
  await expect(page.getByTestId('notification-shade-group-calendar')).toContainText('日历')
  await expect(page.getByTestId('notification-shade-group-map')).toContainText('地图')
  await expect(page.getByTestId('notification-shade-group-mail')).toContainText('邮件')

  await expectNoHorizontalOverflow(page)
  const accessibility = await new AxeBuilder({ page })
    .include('[data-testid="notification-shade"]')
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze()
  expect(accessibility.violations).toEqual([])

  await mkdir(evidenceDir, { recursive: true })
  await page.screenshot({
    path: join(evidenceDir, `${testInfo.project.name}-grouped-day.png`),
    fullPage: true,
  })

  await page.getByTestId('notification-shade-filter-unread').click()
  await expect(page.getByTestId('notification-shade-note-mail-arrival')).toHaveCount(0)
  await expect(page.getByTestId('notification-shade-note-calendar-ready')).toBeVisible()

  await page.getByTestId('notification-shade-dismiss-map-estimate').click()
  await expect(page.getByTestId('notification-shade-note-map-estimate')).toHaveCount(0)
  expect(
    await page.evaluate(() =>
      window.localStorage.getItem('notification-shade-calendar-sentinel'),
    ),
  ).toBe('calendar-owner-unchanged')

  await page.getByTestId('notification-shade-mark-all-read').click()
  await expect(page.getByTestId('notification-shade-filter-unread')).toContainText('未读 0')
  await expectNoHorizontalOverflow(page)
  expect(pageErrors).toEqual([])
})

test('status-bar pull-down opens the shade and a routed notification deep-links to its owner', async ({
  page,
}) => {
  const trigger = page.getByTestId('notification-shade-trigger')
  const box = await trigger.boundingBox()
  expect(box).not.toBeNull()

  await page.mouse.move(box.x + box.width / 2, box.y + 4)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width / 2, box.y + 56, { steps: 4 })
  await page.mouse.up()
  await expect(page.getByTestId('notification-shade')).toBeVisible()

  await page.getByTestId('notification-shade-note-calendar-ready').locator('button').first().click()
  await waitForHashRoute(page, '/calendar')
  await expect(page.getByTestId('notification-shade')).toHaveCount(0)

  await expect
    .poll(() =>
      page.evaluate(() => {
        const raw = window.localStorage.getItem('schatphone:store:system')
        const data = JSON.parse(raw || '{}')?.data
        return data?.notifications?.find((note) => note.id === 'calendar-ready')?.read
      }),
    )
    .toBe(true)
})

test('night mode keeps the grouped shade legible', async ({ page }, testInfo) => {
  await navigateInsideUnlockedApp(page, '/appearance')
  await page.getByTestId('appearance-theme-entry').click()
  await page.getByTestId('appearance-color-mode-night').click()
  await page.getByTestId('appearance-system-theme-cloud-pastel').click()
  await navigateInsideUnlockedApp(page, '/home')
  await page.getByTestId('notification-shade-trigger').click()

  await expect(page.locator('html')).toHaveAttribute('data-color-mode', 'night')
  await expect(page.getByTestId('notification-shade-group-calendar')).toBeVisible()
  await expectNoHorizontalOverflow(page)

  const colors = await page.getByTestId('notification-shade').evaluate((element) => {
    const title = element.querySelector('h1')
    const group = element.querySelector('[data-testid^="notification-shade-group-"]')
    return {
      title: title ? getComputedStyle(title).color : '',
      groupBackground: group ? getComputedStyle(group).backgroundColor : '',
    }
  })
  expect(colors.title).not.toBe('')
  expect(colors.groupBackground).not.toBe('')

  await mkdir(evidenceDir, { recursive: true })
  await page.screenshot({
    path: join(evidenceDir, `${testInfo.project.name}-grouped-night.png`),
    fullPage: true,
  })
})

test('English labels adapt without horizontal overflow', async ({ page }) => {
  await navigateInsideUnlockedApp(page, '/settings?menu=general')
  await page.getByTestId('settings-general-language').selectOption('en-US')
  await navigateInsideUnlockedApp(page, '/home')
  await page.getByTestId('notification-shade-trigger').click()

  await expect(page.getByRole('heading', { name: 'Notification Center' })).toBeVisible()
  await expect(page.getByTestId('notification-shade-filter-all')).toContainText('All')
  await expectNoHorizontalOverflow(page)
})
