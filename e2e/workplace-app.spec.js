import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { navigateInsideUnlockedApp, unlockToHome } from './helpers/navigation.js'

const desktop = { width: 1180, height: 860 }
const pixel5 = { width: 393, height: 851 }
const evidenceDir = fileURLToPath(new URL('../output/e2e/workplace-app-shell/', import.meta.url))

const seedSystem = async (page, { language = 'zh-CN', theme = 'default', once = false } = {}) => {
  await page.addInitScript(
    ({ language, theme, once }) => {
      const seedMarker = 'schatphone:workplace-e2e-seeded'
      if (once && window.sessionStorage.getItem(seedMarker) === '1') return
      if (once) window.sessionStorage.setItem(seedMarker, '1')
      window.localStorage.removeItem('schatphone:workplace-shell:preview-state')
      window.localStorage.setItem(
        'schatphone:store:system',
        JSON.stringify({
          version: 1,
          savedAt: Date.now(),
          data: {
            settings: {
              system: { language, notifications: false, realPushEnabled: false },
              appearance: {
                currentTheme: theme,
                colorMode: theme === 'zen' ? 'night' : 'day',
                wallpaperMode: 'theme',
              },
            },
          },
        }),
      )
    },
    { language, theme, once },
  )
}

const openWorkplace = async (page, viewport = desktop) => {
  await page.setViewportSize(viewport)
  await unlockToHome(page)
  await navigateInsideUnlockedApp(page, '/workplace?from=home&homePage=1')
  await expect(page.getByTestId('workplace-app')).toBeVisible()
}

const expectNoHorizontalOverflow = async (page) => {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
  expect(overflow).toBeLessThanOrEqual(1)
}

test.describe('Work Hub Organization Workplace S1 shell', () => {
  test.beforeAll(async () => {
    await mkdir(evidenceDir, { recursive: true })
  })

  test('desktop day mode completes the ordinary artist work loop', async ({ page }) => {
    await seedSystem(page)
    await openWorkplace(page)

    await expect(page.getByTestId('workplace-call-sheet')).toContainText('Music Bank 预录')
    await page.getByTestId('workplace-today-task-task-in-ear-check').click()
    await expect(page.getByTestId('workplace-today-task-task-in-ear-check')).toHaveClass(/is-complete/)
    await page.getByTestId('workplace-submit-status').click()
    await expect(page.getByTestId('workplace-latest-status')).toBeVisible()

    await page.getByTestId('workplace-tab-channels').click()
    await page.locator('.workplace-compose textarea').fill('收到，我会提前五分钟下楼。')
    await page.getByTestId('workplace-send-message').click()
    await expect(page.getByTestId('workplace-channels')).toContainText('收到，我会提前五分钟下楼。')

    await page.getByTestId('workplace-tab-tasks').click()
    await page.getByTestId('workplace-accept-proposal-radio-20260827').click()
    await expect(page.getByTestId('workplace-proposal-decision')).toContainText('等待排期人员写入日历')
    await expectNoHorizontalOverflow(page)
    await page.screenshot({ path: join(evidenceDir, 'workplace-desktop-day.png'), fullPage: true })
  })

  test('owner handoffs carry references without manufacturing owner records', async ({ page }) => {
    await seedSystem(page)
    await openWorkplace(page)
    await page.getByTestId('workplace-open-map').click()
    await expect(page).toHaveURL(/#\/map/)
    const query = await page.evaluate(() => Object.fromEntries(new URLSearchParams(location.hash.split('?')[1] || '')))
    expect(query).toMatchObject({
      source: 'workplace',
      placeId: 'seoul-kbs-hq',
      mapPackId: 'real-seoul-v1',
      placeRevision: '1',
      world: 'world_modern_seoul',
      returnPath: '/workplace',
      homePage: '1',
    })
    const preview = await page.evaluate(() => JSON.parse(localStorage.getItem('schatphone:workplace-shell:preview-state') || 'null'))
    expect(preview).toBeNull()
  })

  test('simulated Pixel 5 night mode is accessible and keeps artist access pending', async ({ page }) => {
    await seedSystem(page, { theme: 'zen' })
    await openWorkplace(page, pixel5)
    await expect(page.getByTestId('workplace-app')).toHaveClass(/is-night/)
    await page.getByTestId('workplace-tab-organization').click()
    await page.getByTestId('workplace-submit-artist-application').click()
    await expect(page.getByTestId('workplace-artist-application-pending')).toContainText('当前没有艺人发布权限')
    await expectNoHorizontalOverflow(page)
    const results = await new AxeBuilder({ page })
      .include('[data-testid="workplace-app"]')
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze()
    expect(results.violations).toEqual([])
    await page.screenshot({ path: join(evidenceDir, 'workplace-mobile-night.png'), fullPage: true })
  })

  test('renames the workspace in-app and keeps the canonical affiliation credential unchanged', async ({ page }) => {
    await seedSystem(page, { once: true })
    await openWorkplace(page, pixel5)
    await page.getByTestId('workplace-tab-organization').click()
    await page.getByTestId('workplace-open-name-editor').click()
    await page.getByTestId('workplace-app-name-input').fill('星河工作台')
    await page.getByTestId('workplace-organization-name-input').fill('星河娱乐')
    await page.screenshot({ path: join(evidenceDir, 'workplace-mobile-name-editor.png'), fullPage: true })
    await page.getByTestId('workplace-save-names').click()
    await expect(page.locator('.workplace-wordmark')).toContainText('星河工作台')
    await expect(page.locator('.workplace-wordmark')).toContainText('星河娱乐')
    await expect(page.getByTestId('workplace-credential')).toContainText('Morrow · 艺人所属凭证')
    await expectNoHorizontalOverflow(page)
    await page.screenshot({ path: join(evidenceDir, 'workplace-mobile-renamed.png'), fullPage: true })
    await expect.poll(() => page.evaluate(() => {
      const system = JSON.parse(localStorage.getItem('schatphone:store:system') || '{}')
      return system?.data?.settings?.appearance?.appIconOverrides?.app_workplace?.displayName || ''
    })).toBe('星河工作台')
    await expect.poll(() => page.evaluate(() => {
      const workplace = JSON.parse(localStorage.getItem('schatphone:workplace-shell:preview-state') || '{}')
      return workplace.organizationDisplayName || ''
    })).toBe('星河娱乐')

    await page.reload()
    await unlockToHome(page)
    await navigateInsideUnlockedApp(page, '/workplace?from=home&homePage=1')
    await expect(page.getByTestId('workplace-app')).toBeVisible()
    await expect(page.locator('.workplace-wordmark')).toContainText('星河工作台')
    await expect(page.locator('.workplace-wordmark')).toContainText('星河娱乐')
  })

  test('English long messages wrap on simulated Pixel 5', async ({ page }) => {
    await seedSystem(page, { language: 'en-US' })
    await openWorkplace(page, pixel5)
    await expect(page.getByTestId('workplace-app')).toContainText('Good evening, V')
    await page.getByTestId('workplace-tab-channels').click()
    await page.locator('.workplace-compose textarea').fill(
      'Confirmed. I will bring the in-ear case, identification credential, backup battery, and the revised introduction copy before the vehicle reaches the lobby.',
    )
    await page.getByTestId('workplace-send-message').click()
    await expect(page.getByTestId('workplace-channels')).toContainText('backup battery')
    await expectNoHorizontalOverflow(page)
    await page.screenshot({ path: join(evidenceDir, 'workplace-mobile-english.png'), fullPage: true })
  })
})
