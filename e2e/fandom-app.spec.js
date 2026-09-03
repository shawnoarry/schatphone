import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { navigateInsideUnlockedApp, unlockToHome } from './helpers/navigation.js'

const desktop = { width: 1180, height: 860 }
const pixel5 = { width: 393, height: 851 }
const evidenceDir = fileURLToPath(new URL('../output/e2e/fandom-app-shell/', import.meta.url))

const seedSystem = async (page, { language = 'zh-CN', theme = 'default', keepFandom = false } = {}) => {
  await page.addInitScript(({ language, theme, keepFandom }) => {
    if (!keepFandom) localStorage.removeItem('schatphone:fandom-shell:preview-state')
    localStorage.removeItem('schatphone:workplace-shell:preview-state')
    localStorage.setItem('schatphone:store:system', JSON.stringify({ version: 1, savedAt: Date.now(), data: { settings: { system: { language, notifications: false, realPushEnabled: false }, appearance: { currentTheme: theme, colorMode: theme === 'zen' ? 'night' : 'day', wallpaperMode: 'theme' } } } }))
  }, { language, theme, keepFandom })
}

const openFandom = async (page, viewport = desktop) => {
  await page.setViewportSize(viewport)
  await unlockToHome(page)
  await navigateInsideUnlockedApp(page, '/fandom?from=home&homePage=2')
  await expect(page.getByTestId('fandom-app')).toBeVisible()
}

const expectNoHorizontalOverflow = async (page) => {
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1)
}

test.describe('Aster unified fandom S1 shell', () => {
  test.beforeAll(async () => { await mkdir(evidenceDir, { recursive: true }) })

  test('desktop keeps the fixed night-sky identity through the ordinary consumer loop', async ({ page }) => {
    await seedSystem(page)
    await openFandom(page)
    await expect(page.getByTestId('fandom-public-schedule')).toContainText('官方公开日程')
    await page.getByTestId('fandom-featured-follow').click()
    await page.getByTestId('fandom-post-post_hanul_showcase_notice').click()
    await expect(page.getByTestId('fandom-post-detail')).toContainText('同一稳定帖子 ID')
    await page.getByTestId('fandom-post-detail').getByRole('button').click()
    await page.getByTestId('fandom-tab-messages').click()
    await expect(page.getByTestId('fandom-messages')).toContainText('不是 Chat 私聊')
    await page.getByTestId('fandom-read-subscription-yun-iseo-preview').click()
    await expectNoHorizontalOverflow(page)
    await page.screenshot({ path: join(evidenceDir, 'fandom-desktop-zh.png'), fullPage: true })
  })

  test('simulated Pixel 5 keeps the fixed night-sky identity under system zen, locked and accessible', async ({ page }) => {
    await seedSystem(page, { theme: 'zen' })
    await openFandom(page, pixel5)
    await expect(page.getByTestId('fandom-app')).not.toHaveClass(/night/)
    const paper = await page.getByTestId('fandom-app').evaluate((el) => getComputedStyle(el).backgroundColor)
    expect(paper).toBe('rgb(13, 16, 32)')
    await page.getByTestId('fandom-tab-me').click()
    await expect(page.getByTestId('fandom-artist-access')).toContainText('当前未开通')
    await expect(page.getByTestId('fandom-app')).not.toContainText('发布动态')
    const results = await new AxeBuilder({ page }).include('[data-testid="fandom-app"]').withTags(['wcag2a', 'wcag2aa']).analyze()
    expect(results.violations).toEqual([])
    await expectNoHorizontalOverflow(page)
    await page.screenshot({ path: join(evidenceDir, 'fandom-mobile-zen.png'), fullPage: true })
  })

  test('Work Hub fails closed without organization authority and never unlocks artist workspace', async ({ page }) => {
    await seedSystem(page)
    await openFandom(page, pixel5)
    await page.getByTestId('fandom-tab-me').click()
    await page.getByTestId('fandom-open-workplace').click()
    await expect(page).toHaveURL(/#\/workplace/)
    const workHubEmpty = page.getByTestId('work-hub-empty')
    await expect(workHubEmpty).toContainText('尚未连接组织')
    await expect(workHubEmpty).toContainText('不会自动创建所属')
    await expect(page.getByTestId('workplace-tab-organization')).toHaveCount(0)
    await workHubEmpty.getByRole('button', { name: '关闭' }).click()
    await expect(page).toHaveURL(/#\/fandom/)
    await page.getByTestId('fandom-tab-me').click()
    await expect(page.getByTestId('fandom-artist-access')).toContainText('当前未开通')
    await expect(page.getByTestId('fandom-app')).not.toContainText('发布动态')
  })

  test('simulated Pixel 5 English layout contains no Chinese UI and does not overflow', async ({ page }) => {
    await seedSystem(page, { language: 'en-US' })
    await openFandom(page, pixel5)
    await expect(page.getByTestId('fandom-app')).toContainText('Community edit')
    await page.getByTestId('fandom-tab-messages').click()
    await expect(page.getByTestId('fandom-messages')).toContainText('not a Chat DM')
    const body = await page.getByTestId('fandom-app').innerText()
    expect(body).not.toMatch(/[\u4e00-\u9fff]/)
    await expectNoHorizontalOverflow(page)
    await page.screenshot({ path: join(evidenceDir, 'fandom-mobile-english.png'), fullPage: true })
  })

  test('consumer preview state survives reopen without creating owner records', async ({ page }) => {
    await seedSystem(page, { keepFandom: true })
    await openFandom(page, pixel5)
    await page.getByTestId('fandom-tab-messages').click()
    await page.getByTestId('fandom-read-subscription-yun-iseo-preview').click()
    await page.reload()
    await unlockToHome(page)
    await navigateInsideUnlockedApp(page, '/fandom?from=home&homePage=2')
    await expect(page.getByTestId('fandom-messages')).toBeVisible()
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('schatphone:fandom-shell:preview-state') || '{}'))
    expect(stored.readMessageIds).toHaveLength(2)
    expect(JSON.stringify(stored)).not.toMatch(/wallet|payment|entitlement|communityPost|chatMessage|eventInstance/i)
  })
})
