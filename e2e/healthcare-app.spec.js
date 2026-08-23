import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { navigateInsideUnlockedApp, unlockToHome } from './helpers/navigation.js'

const desktop = { width: 1180, height: 860 }
const pixel5 = { width: 393, height: 851 }
const evidenceDir = fileURLToPath(new URL('../output/e2e/healthcare-app-shell/', import.meta.url))

const seedSystem = async (page, { language = 'zh-CN', theme = 'default' } = {}) => {
  await page.addInitScript(
    ({ language, theme }) => {
      window.localStorage.setItem(
        'schatphone:store:system',
        JSON.stringify({
          version: 1,
          savedAt: Date.now(),
          data: {
            settings: {
              system: { language, notifications: false, realPushEnabled: false },
              appearance: { currentTheme: theme, wallpaperMode: 'theme' },
            },
          },
        }),
      )
    },
    { language, theme },
  )
}

const openHealthcare = async (page, viewport = desktop) => {
  await page.setViewportSize(viewport)
  await unlockToHome(page)
  await navigateInsideUnlockedApp(page, '/healthcare')
  await expect(page.getByTestId('ondam-care-app')).toBeVisible()
}

const expectNoHorizontalOverflow = async (page) => {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  expect(overflow).toBeLessThanOrEqual(1)
}

test.describe('Ondam Care Healthcare S1 shell', () => {
  test.beforeAll(async () => {
    await mkdir(evidenceDir, { recursive: true })
  })

  test('desktop day theme supports discovery, booking, and appointment cancellation', async ({ page }) => {
    await seedSystem(page)
    await openHealthcare(page)
    await page.getByTestId('healthcare-institution-ondam-daehakro-clinic').locator('button').click()
    await page.getByTestId('healthcare-book-routine-consultation').click()
    await expect(page.getByTestId('healthcare-booking-sheet')).toContainText('只形成温谈健康 S1 预约')
    await page.getByTestId('healthcare-booking-confirm').click()
    await expect(page.getByTestId('healthcare-appointment-detail')).toContainText('预约已保存在本设备')
    await page.getByTestId('healthcare-cancel-appointment').click()
    await expect(page.getByTestId('healthcare-appointment-detail')).toContainText('已取消')
    await expectNoHorizontalOverflow(page)
    await page.screenshot({ path: join(evidenceDir, 'appointment-chromium.png'), fullPage: true })
  })

  test('desktop report detail keeps authored correction and long table inside its scroller', async ({ page }) => {
    await seedSystem(page)
    await openHealthcare(page)
    await page.getByTestId('healthcare-tab-reports').click()
    await page.getByTestId('healthcare-report-report-routine-screening-2026').click()
    await expect(page.getByTestId('healthcare-report-detail')).toContainText('世界内 authored 示例记录')
    await expect(page.getByTestId('healthcare-report-correction')).toContainText('血红蛋白')
    await expectNoHorizontalOverflow(page)
    await page.screenshot({ path: join(evidenceDir, 'report-chromium.png'), fullPage: true })
  })

  test('simulated Pixel 5 night theme remains readable, accessible, and overflow-free', async ({ page }) => {
    await seedSystem(page, { language: 'zh-CN', theme: 'zen' })
    await openHealthcare(page, pixel5)
    await page.getByTestId('healthcare-tab-reports').click()
    await page.getByTestId('healthcare-report-report-routine-screening-2026').click()
    await expect(page.getByTestId('ondam-care-app')).toHaveClass(/is-night/)
    await expectNoHorizontalOverflow(page)
    const results = await new AxeBuilder({ page }).include('[data-testid="ondam-care-app"]').withTags(['wcag2a', 'wcag2aa']).analyze()
    expect(results.violations).toEqual([])
    await page.screenshot({ path: join(evidenceDir, 'report-mobile-chrome.png'), fullPage: true })
  })

  test('English long-content and withdrawn-source paths stay honest on Pixel 5', async ({ page }) => {
    await seedSystem(page, { language: 'en-US', theme: 'default' })
    await openHealthcare(page, pixel5)
    await page.getByTestId('healthcare-institution-ondam-hannam-counseling').locator('button').click()
    await expect(page.getByTestId('healthcare-institution-detail')).toContainText('place source was withdrawn')
    await expect(page.getByTestId('healthcare-open-map')).toHaveCount(0)
    await expectNoHorizontalOverflow(page)
  })
})
