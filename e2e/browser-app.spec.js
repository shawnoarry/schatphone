import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { navigateInsideUnlockedApp, unlockToHome } from './helpers/navigation.js'

const seedBrowserSystem = async (page, { language = 'zh-CN', theme = 'default' } = {}) => {
  await page.addInitScript(
    ({ language, theme }) => {
      const seedKey = `schatphone:e2e:browser-system-${language}-${theme}`
      if (window.sessionStorage.getItem(seedKey) === '1') return
      window.localStorage.removeItem('schatphone:browser-shell:s1-state')
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
      window.sessionStorage.setItem(seedKey, '1')
    },
    { language, theme },
  )
}

const openBrowser = async (page) => {
  await unlockToHome(page)
  await navigateInsideUnlockedApp(page, '/browser')
  await expect(page.getByTestId('prism-browser-app')).toBeVisible()
}

const expectNoBrowserOverflow = async (page) => {
  const overflow = await page.evaluate(() => {
    const target = document.querySelector('[data-testid="prism-browser-app"]')
    return {
      document: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      body: document.body.scrollWidth - document.body.clientWidth,
      target: target instanceof HTMLElement ? target.scrollWidth - target.clientWidth : 0,
    }
  })
  expect(overflow.document, 'document should not overflow horizontally').toBeLessThanOrEqual(1)
  expect(overflow.body, 'body should not overflow horizontally').toBeLessThanOrEqual(1)
  expect(overflow.target, 'Browser shell should not overflow horizontally').toBeLessThanOrEqual(1)
}

test('Browser searches Help and Current World without a provider', async ({ page }, testInfo) => {
  const pageErrors = []
  page.on('pageerror', (error) => pageErrors.push(error.message))
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await seedBrowserSystem(page)
  await openBrowser(page)

  await expect(page.getByTestId('browser-home')).toContainText('你想找到什么？')
  await page.getByTestId('browser-search-input').fill('日历 日程 行程')
  await page.getByTestId('browser-search-submit').click()
  const helpResult = page.getByTestId('browser-result-help_calendar_agenda_journey')
  await expect(helpResult).toBeVisible()
  await expect(helpResult).toContainText('使用帮助')
  await expect(page.getByTestId('browser-search-results')).toContainText('零 token')

  await helpResult.locator('.prism-result__body').click()
  await expect(page.getByTestId('browser-detail')).toContainText('日历：什么时候发生')
  await expect(page.getByTestId('browser-detail')).toContainText('受阻')
  await page.getByTestId('browser-detail-back').click()

  await page.getByTestId('browser-search-input').fill('Hanul 放送中心')
  await page.getByTestId('browser-search-submit').click()
  const worldResult = page.getByTestId('browser-result-world_hanul_broadcast_center')
  await expect(worldResult).toContainText('现代首尔')
  await worldResult.locator('.prism-result__body').click()
  await expect(page.getByTestId('browser-detail')).toContainText('当前世界公开页面')
  await expect(page.getByTestId('browser-detail')).toContainText('当前世界中的公开资料投影')

  const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
  expect(axe.violations.filter((violation) => violation.impact === 'critical')).toEqual([])
  await expectNoBrowserOverflow(page)
  expect(pageErrors).toEqual([])

  await testInfo.attach(`browser-world-${testInfo.project.name}`, {
    body: await page.screenshot(),
    contentType: 'image/png',
  })
})

test('Browser keeps Web failure isolated and persists history and bookmarks', async ({ page }) => {
  const pageErrors = []
  page.on('pageerror', (error) => pageErrors.push(error.message))
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await seedBrowserSystem(page, { language: 'en-US', theme: 'default' })
  await openBrowser(page)

  await page.getByTestId('browser-search-input').fill('change delivery address')
  await page.getByTestId('browser-search-submit').click()
  const resultId = 'help_food_delivery_change_address'
  await expect(page.getByTestId(`browser-result-${resultId}`)).toBeVisible()
  await page.getByTestId(`browser-bookmark-${resultId}`).click()

  await page.getByTestId('browser-source-web').click()
  await expect(page.getByTestId('browser-web-unavailable')).toContainText('does not fabricate web results')
  await page.getByTestId('browser-web-unavailable').getByRole('button').click()
  await expect(page.getByTestId(`browser-result-${resultId}`)).toBeVisible()

  await page.reload()
  await unlockToHome(page)
  await navigateInsideUnlockedApp(page, '/browser')
  await page.getByTestId('browser-bookmarks-open').click()
  await expect(page.getByTestId(`browser-result-${resultId}`)).toBeVisible()
  await page.getByTestId('browser-history-open').click()
  await expect(page.getByTestId('browser-library')).toContainText('change delivery address')
  await expectNoBrowserOverflow(page)
  expect(pageErrors).toEqual([])
})

test('Chinese zen mode keeps the fixed mint-paper identity, long content readable, stale pages fail closed', async ({ page }, testInfo) => {
  const pageErrors = []
  page.on('pageerror', (error) => pageErrors.push(error.message))
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await seedBrowserSystem(page, { language: 'zh-CN', theme: 'zen' })
  await openBrowser(page)

  const app = page.getByTestId('prism-browser-app')
  await expect(app).not.toHaveClass(/night/)
  const prismBg = await app.evaluate((el) => getComputedStyle(el).getPropertyValue('--prism-bg').trim())
  expect(prismBg).toBe('#eef3ef')
  await page.getByTestId('browser-search-input').fill('旧练习楼')
  await page.getByTestId('browser-search-submit').click()
  const staleResult = page.getByTestId('browser-result-world_retired_training_annex')
  await expect(staleResult).toContainText('来源不可用')
  await staleResult.locator('.prism-result__body').click()
  await expect(page.getByTestId('browser-detail')).toContainText('这个页面已经不可用')
  await expect(page.getByTestId('browser-detail-owner-action')).toHaveCount(0)

  const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
  expect(
    axe.violations.filter(
      (violation) => violation.id === 'color-contrast' || violation.impact === 'critical',
    ),
  ).toEqual([])
  await expectNoBrowserOverflow(page)
  expect(pageErrors).toEqual([])

  await testInfo.attach(`browser-zen-stale-${testInfo.project.name}`, {
    body: await page.screenshot(),
    contentType: 'image/png',
  })
})
