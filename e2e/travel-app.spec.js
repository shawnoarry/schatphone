import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { navigateInsideUnlockedApp, unlockToHome } from './helpers/navigation.js'

const desktop = { width: 1180, height: 860 }
const pixel5 = { width: 393, height: 851 }
const evidenceDir = fileURLToPath(new URL('../output/e2e/travel-app-shell/', import.meta.url))

const seedSystem = async (page, { language = 'zh-CN', theme = 'default', keepTravel = false } = {}) => {
  await page.addInitScript(({ language, theme, keepTravel }) => {
    if (!keepTravel) localStorage.removeItem('schatphone:travel-shell:preview-state')
    localStorage.setItem('schatphone:store:system', JSON.stringify({ version: 1, savedAt: Date.now(), data: { settings: { system: { language, notifications: false, realPushEnabled: false }, appearance: { currentTheme: theme, colorMode: theme === 'zen' ? 'night' : 'day', wallpaperMode: 'theme' } } } }))
  }, { language, theme, keepTravel })
}

const openTravel = async (page, viewport = desktop) => {
  await page.setViewportSize(viewport)
  await unlockToHome(page)
  await navigateInsideUnlockedApp(page, '/travel?from=home&homePage=2')
  await expect(page.getByTestId('travel-app')).toBeVisible()
}
const expectNoHorizontalOverflow = async (page) => {
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1)
}

test.describe('ROAM Travel S1 shell', () => {
  test.beforeAll(async () => { await mkdir(evidenceDir, { recursive: true }) })

  test('desktop discovery creates a local stay intent without owner writes', async ({ page }) => {
    await seedSystem(page)
    await openTravel(page)
    await page.getByTestId('travel-filter-city').click()
    await page.getByTestId('travel-stay-roam-stay-seongsu-riverside').click()
    await expect(page.getByTestId('travel-stay-detail')).toContainText('不扣款、不锁房')
    await page.getByTestId('travel-save-draft').click()
    await page.getByTestId('travel-stay-detail').getByRole('button', { name: '关闭详情' }).click()
    await page.getByTestId('travel-tab-trips').click()
    await expect(page.getByTestId('travel-trips')).toContainText('不是订单、付款、房态锁定或日历行程')
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('schatphone:travel-shell:preview-state') || '{}'))
    expect(stored.bookingDrafts).toHaveLength(1)
    expect(JSON.stringify(stored)).not.toMatch(/reservationId|wallet|payment|calendar|route|agenda|eventInstance|notification/i)
    await expectNoHorizontalOverflow(page)
    await page.screenshot({ path: join(evidenceDir, 'travel-desktop-zh.png'), fullPage: true })
  })

  test('simulated Pixel 5 under system zen keeps the fixed destination identity and stale sources fail closed', async ({ page }) => {
    await seedSystem(page, { theme: 'zen' })
    await openTravel(page, pixel5)
    await expect(page.getByTestId('travel-app')).not.toHaveClass(/night/)
    const roamBg = await page.evaluate(() => getComputedStyle(document.querySelector('[data-testid="travel-app"]')).backgroundColor)
    expect(roamBg).toBe('rgb(250, 246, 239)')
    await page.getByTestId('travel-stay-roam-stay-sokcho-cloudline').click()
    await expect(page.getByTestId('travel-source-closed')).toContainText('不能用旧价格建立意向')
    await expect(page.getByTestId('travel-save-draft')).toHaveCount(0)
    const results = await new AxeBuilder({ page }).include('[data-testid="travel-app"]').withTags(['wcag2a', 'wcag2aa']).analyze()
    expect(results.violations).toEqual([])
    await expectNoHorizontalOverflow(page)
    await page.screenshot({ path: join(evidenceDir, 'travel-mobile-zen.png'), fullPage: true })
  })

  test('simulated Pixel 5 English search remains localized and contained', async ({ page }) => {
    await seedSystem(page, { language: 'en-US' })
    await openTravel(page, pixel5)
    await page.getByTestId('travel-tab-search').click()
    await page.getByTestId('travel-search-input').fill('Busan')
    await expect(page.getByTestId('travel-search')).toContainText('Blue Current House')
    expect(await page.getByTestId('travel-app').innerText()).not.toMatch(/[\u4e00-\u9fff]/)
    await expectNoHorizontalOverflow(page)
    await page.screenshot({ path: join(evidenceDir, 'travel-mobile-english.png'), fullPage: true })
  })

  test('local preview state survives reopen without becoming a reservation', async ({ page }) => {
    await seedSystem(page, { keepTravel: true })
    await openTravel(page, pixel5)
    await page.getByTestId('travel-stay-roam-stay-busan-wavehouse').click()
    await page.getByTestId('travel-save-draft').click()
    await page.getByTestId('travel-stay-detail').getByRole('button', { name: '关闭详情' }).click()
    await page.getByTestId('travel-back').click()
    await expect(page).toHaveURL(/#\/home/)
    await navigateInsideUnlockedApp(page, '/travel?from=home&homePage=2')
    await page.getByTestId('travel-tab-trips').click()
    await expect(page.getByTestId('travel-trips')).toContainText('青浪屋')
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('schatphone:travel-shell:preview-state') || '{}'))
    expect(stored.bookingDrafts).toHaveLength(1)
    expect(JSON.stringify(stored)).not.toMatch(/reservationId|wallet|payment|calendar|agenda|eventInstance/i)
  })
})
