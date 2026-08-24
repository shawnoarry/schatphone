import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { navigateInsideUnlockedApp, unlockToHome } from './helpers/navigation.js'

const desktop = { width: 1180, height: 860 }
const pixel5 = { width: 393, height: 851 }
const evidenceDir = fileURLToPath(new URL('../output/e2e/tickets-app-shell/', import.meta.url))

const seedSystem = async (page, { language = 'zh-CN', theme = 'default', keepTickets = false } = {}) => {
  await page.addInitScript(({ language, theme, keepTickets }) => {
    if (!keepTickets) localStorage.removeItem('schatphone:tickets-shell:preview-state')
    localStorage.setItem('schatphone:store:system', JSON.stringify({ version: 1, savedAt: Date.now(), data: { settings: { system: { language, notifications: false, realPushEnabled: false }, appearance: { currentTheme: theme, colorMode: theme === 'zen' ? 'night' : 'day', wallpaperMode: 'theme' } } } }))
  }, { language, theme, keepTickets })
}

const openTickets = async (page, viewport = desktop) => {
  await page.setViewportSize(viewport)
  await unlockToHome(page)
  await navigateInsideUnlockedApp(page, '/tickets?from=home&homePage=2')
  await expect(page.getByTestId('tickets-app')).toBeVisible()
}

const expectNoHorizontalOverflow = async (page) => {
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1)
}

test.describe('GATE Tickets S1 shell', () => {
  test.beforeAll(async () => { await mkdir(evidenceDir, { recursive: true }) })

  test('desktop discovery creates a local intent draft without owner writes', async ({ page }) => {
    await seedSystem(page)
    await openTickets(page)
    await page.getByTestId('tickets-category-concert').click()
    await page.getByTestId('tickets-event-gate-event-hanul-dome-20260912').click()
    await expect(page.getByTestId('tickets-event-detail')).toContainText('不锁座、不付款')
    await page.getByTestId('tickets-save-draft').click()
    await page.getByTestId('tickets-event-detail').getByRole('button', { name: '关闭' }).click()
    await page.getByTestId('tickets-tab-passes').click()
    await expect(page.getByTestId('tickets-passes')).toContainText('不是订单、付款记录或有效电子票')
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('schatphone:tickets-shell:preview-state') || '{}'))
    expect(stored.draftEventIds).toEqual(['gate-event-hanul-dome-20260912'])
    expect(JSON.stringify(stored)).not.toMatch(/seat|order|wallet|payment|calendar|route|agenda|eventInstance/i)
    await expectNoHorizontalOverflow(page)
    await page.screenshot({ path: join(evidenceDir, 'tickets-desktop-day.png'), fullPage: true })
  })

  test('simulated Pixel 5 night mode is accessible and keeps sold-out fail-closed', async ({ page }) => {
    await seedSystem(page, { theme: 'zen' })
    await openTickets(page, pixel5)
    await expect(page.getByTestId('tickets-app')).toHaveClass(/is-night/)
    await page.getByTestId('tickets-event-gate-event-iseo-listening-20260920').click()
    await expect(page.getByTestId('tickets-save-draft')).toBeDisabled()
    const results = await new AxeBuilder({ page }).include('[data-testid="tickets-app"]').withTags(['wcag2a', 'wcag2aa']).analyze()
    expect(results.violations).toEqual([])
    await expectNoHorizontalOverflow(page)
    await page.screenshot({ path: join(evidenceDir, 'tickets-mobile-night.png'), fullPage: true })
  })

  test('simulated Pixel 5 English search and long content do not overflow', async ({ page }) => {
    await seedSystem(page, { language: 'en-US' })
    await openTickets(page, pixel5)
    await page.getByTestId('tickets-tab-search').click()
    await page.getByTestId('tickets-search-input').fill('Dongdaemun')
    await expect(page.getByTestId('tickets-search')).toContainText('Folded Seoul')
    expect(await page.getByTestId('tickets-app').innerText()).not.toMatch(/[\u4e00-\u9fff]/)
    await expectNoHorizontalOverflow(page)
    await page.screenshot({ path: join(evidenceDir, 'tickets-mobile-english.png'), fullPage: true })
  })

  test('local preview state survives reopen without becoming an admission record', async ({ page }) => {
    await seedSystem(page, { keepTickets: true })
    await openTickets(page, pixel5)
    await page.getByTestId('tickets-event-gate-event-nodeul-live-20260903').click()
    await page.getByTestId('tickets-save-draft').click()
    await page.getByTestId('tickets-event-detail').getByRole('button', { name: '关闭' }).click()
    await page.getByTestId('tickets-back').click()
    await expect(page).toHaveURL(/#\/home/)
    await navigateInsideUnlockedApp(page, '/tickets?from=home&homePage=2')
    await page.getByTestId('tickets-tab-passes').click()
    await expect(page.getByTestId('tickets-passes')).toContainText('江面之外')
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('schatphone:tickets-shell:preview-state') || '{}'))
    expect(stored.draftEventIds).toEqual(['gate-event-nodeul-live-20260903'])
    expect(JSON.stringify(stored)).not.toMatch(/ticketId|seat|order|wallet|payment|calendar|agenda|eventInstance/i)
  })
})
