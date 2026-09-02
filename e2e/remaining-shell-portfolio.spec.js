import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { navigateInsideUnlockedApp, unlockToHome } from './helpers/navigation.js'

const desktop = { width: 1180, height: 860 }
const pixel5 = { width: 393, height: 851 }
const evidenceDir = fileURLToPath(new URL('../output/e2e/remaining-shell-portfolio/', import.meta.url))
const seedSystem = async (page, { language = 'zh-CN', theme = 'default' } = {}) => {
  await page.addInitScript(({ language, theme }) => {
    for (const key of ['schatphone:intercity-shell:preview-state', 'schatphone:creator-rights-shell:preview-state', 'schatphone:parcel-shell:preview-state', 'schatphone:career-shell:preview-state']) localStorage.removeItem(key)
    localStorage.setItem('schatphone:store:system', JSON.stringify({ version: 1, savedAt: Date.now(), data: { settings: { system: { language, notifications: false, realPushEnabled: false }, appearance: { currentTheme: theme, colorMode: theme === 'zen' ? 'night' : 'day', wallpaperMode: 'theme' } } } }))
  }, { language, theme })
}
const openApp = async (page, route, testId, viewport) => { await page.setViewportSize(viewport); await unlockToHome(page); await navigateInsideUnlockedApp(page, `${route}?from=home&homePage=3`); await expect(page.getByTestId(testId)).toBeVisible() }
const expectHealthy = async (page, testId) => {
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1)
  const results = await new AxeBuilder({ page }).include(`[data-testid="${testId}"]`).withTags(['wcag2a', 'wcag2aa']).analyze()
  expect(results.violations).toEqual([])
}

test.describe('remaining S1 shell portfolio', () => {
  test.beforeAll(async () => { await mkdir(evidenceDir, { recursive: true }) })

  test('VIA desktop creates a local travel intent and stale schedules fail closed', async ({ page }) => {
    await seedSystem(page); await openApp(page, '/intercity', 'intercity-app', desktop)
    await page.getByTestId('intercity-service-via-rail-seoul-busan-0828').click(); await page.getByTestId('intercity-save-draft').click(); await page.getByTestId('intercity-tab-trips').click()
    await expect(page.getByTestId('intercity-trips')).toContainText('不是订单、占座、付款、登机牌或日历行程')
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('schatphone:intercity-shell:preview-state') || '{}'))
    expect(stored.tripDrafts).toHaveLength(1); expect(JSON.stringify(stored)).not.toMatch(/ticketId|seatHold|wallet|payment|calendar|mapRoute|eventInstance/i)
    await expectHealthy(page, 'intercity-app'); await page.screenshot({ path: join(evidenceDir, 'via-desktop-day.png'), fullPage: true })
  })

  test('VIA simulated Pixel 5 English night closes stale data', async ({ page }) => {
    await seedSystem(page, { language: 'en-US', theme: 'zen' }); await openApp(page, '/intercity', 'intercity-app', pixel5)
    await page.getByTestId('intercity-service-via-flight-incheon-tokyo-0902').click(); await expect(page.getByTestId('intercity-source-closed')).toContainText('Old schedules and fares cannot create an intent')
    await expect(page.getByTestId('intercity-save-draft')).toHaveCount(0); expect(await page.getByTestId('intercity-app').innerText()).not.toMatch(/[\u4e00-\u9fff]/)
    await expectHealthy(page, 'intercity-app'); await page.screenshot({ path: join(evidenceDir, 'via-mobile-night-en.png'), fullPage: true })
  })

  test('CREDO desktop keeps rights and declaration non-authoritative', async ({ page }) => {
    await seedSystem(page); await openApp(page, '/creator-rights', 'creator-rights-app', desktop)
    await page.getByTestId('creator-work-credo-work-neon-weather').click(); await expect(page.getByTestId('creator-rights-detail')).toContainText('不授予版权')
    await page.getByTestId('creator-rights-detail').getByRole('button', { name: '关闭' }).click(); await page.getByTestId('creator-rights-tab-me').click(); await expect(page.getByTestId('creator-rights-me')).toContainText('不提交、不签名、不生成认证')
    await expectHealthy(page, 'creator-rights-app'); await page.screenshot({ path: join(evidenceDir, 'credo-desktop-day.png'), fullPage: true })
  })

  test('CREDO simulated Pixel 5 English night remains contained', async ({ page }) => {
    await seedSystem(page, { language: 'en-US', theme: 'zen' }); await openApp(page, '/creator-rights', 'creator-rights-app', pixel5)
    await page.getByTestId('creator-rights-tab-statements').click(); await expect(page.getByTestId('creator-rights-statements')).toContainText('VISIBLE TOTAL'); expect(await page.getByTestId('creator-rights-app').innerText()).not.toMatch(/[\u4e00-\u9fff]/)
    await expectHealthy(page, 'creator-rights-app'); await page.screenshot({ path: join(evidenceDir, 'credo-mobile-night-en.png'), fullPage: true })
  })

  test('POSTA desktop prepares only a local sending draft', async ({ page }) => {
    await seedSystem(page); await openApp(page, '/parcel', 'parcel-app', desktop)
    await page.getByTestId('parcel-tab-send').click(); await expect(page.getByTestId('parcel-send')).toContainText('不创建运单、不计费、不预约取件')
    await expectHealthy(page, 'parcel-app'); await page.screenshot({ path: join(evidenceDir, 'posta-desktop-zh.png'), fullPage: true })
  })

  test('POSTA keeps its fixed postal identity under system zen theme', async ({ page }) => {
    await seedSystem(page, { language: 'en-US', theme: 'zen' }); await openApp(page, '/parcel', 'parcel-app', pixel5)
    const appBackground = await page.getByTestId('parcel-app').evaluate((el) => getComputedStyle(el).backgroundColor)
    expect(appBackground).toBe('rgb(243, 238, 226)')
    await page.getByTestId('parcel-shipment-posta-shipment-stale-0820').click(); await expect(page.getByTestId('parcel-detail')).toContainText('Authored tracking records are preview-only'); expect(await page.getByTestId('parcel-app').innerText()).not.toMatch(/[\u4e00-\u9fff]/)
    await expectHealthy(page, 'parcel-app'); await page.screenshot({ path: join(evidenceDir, 'posta-mobile-zen-en.png'), fullPage: true })
  })

  test('NEXT desktop creates a local open-listing draft only', async ({ page }) => {
    await seedSystem(page); await openApp(page, '/career', 'career-app', desktop)
    await page.getByTestId('career-listing-next-audition-vocal-0903').click(); await page.getByTestId('career-save-draft').click(); await page.getByTestId('career-tab-applications').click(); await expect(page.getByTestId('career-applications')).toContainText('还没有递交的材料')
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('schatphone:career-shell:preview-state') || '{}')); expect(stored.applicationDrafts).toHaveLength(1); expect(JSON.stringify(stored)).not.toMatch(/submittedAt|institutionReceipt|interview|offer|credential|calendar/i)
    await expectHealthy(page, 'career-app'); await page.screenshot({ path: join(evidenceDir, 'next-desktop-day.png'), fullPage: true })
  })

  test('NEXT simulated Pixel 5 English night keeps invite-only access closed', async ({ page }) => {
    await seedSystem(page, { language: 'en-US', theme: 'zen' }); await openApp(page, '/career', 'career-app', pixel5)
    await page.getByTestId('career-listing-next-invite-radio-0828').click(); await expect(page.getByTestId('career-closed')).toContainText('Without an institution invitation credential, access stays closed'); await expect(page.getByTestId('career-save-draft')).toHaveCount(0); expect(await page.getByTestId('career-app').innerText()).not.toMatch(/[\u4e00-\u9fff]/)
    await expectHealthy(page, 'career-app'); await page.screenshot({ path: join(evidenceDir, 'next-mobile-night-en.png'), fullPage: true })
  })
})
