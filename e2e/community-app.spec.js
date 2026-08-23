import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { navigateInsideUnlockedApp, unlockToHome, waitForAppRouteReady } from './helpers/navigation.js'

const seedCommunitySystem = async (page, { language = 'zh-CN', theme = 'default' } = {}) => {
  await page.addInitScript(({ languageValue, themeValue }) => {
    window.localStorage.setItem(
      'schatphone:store:system',
      JSON.stringify({
        version: 1,
        savedAt: Date.now(),
        data: {
          settings: {
            system: { language: languageValue, notifications: false, realPushEnabled: false },
            appearance: { currentTheme: themeValue, wallpaperMode: 'theme' },
          },
        },
      }),
    )
  }, { languageValue: language, themeValue: theme })
}

const openCommunity = async (page) => {
  await unlockToHome(page)
  await navigateInsideUnlockedApp(page, '/community?homePage=1&from=home')
  await waitForAppRouteReady(page, '/community')
  await expect(page.getByTestId('community-app')).toBeVisible()
}

const expectNoCommunityOverflow = async (page) => {
  const overflow = await page.evaluate(() => {
    const root = document.querySelector('[data-testid="community-app"]')
    const feed = document.querySelector('.ripple-feed')
    return {
      document: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      body: document.body.scrollWidth - document.body.clientWidth,
      root: root instanceof HTMLElement ? root.scrollWidth - root.clientWidth : 0,
      feed: feed instanceof HTMLElement ? feed.scrollWidth - feed.clientWidth : 0,
    }
  })
  expect(overflow.document).toBeLessThanOrEqual(1)
  expect(overflow.body).toBeLessThanOrEqual(1)
  expect(overflow.root).toBeLessThanOrEqual(1)
  expect(overflow.feed).toBeLessThanOrEqual(1)
}

test('Ripple opens as a readable local Following feed', async ({ page }) => {
  const pageErrors = []
  page.on('pageerror', (error) => pageErrors.push(error.message))
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await seedCommunitySystem(page)
  await openCommunity(page)

  await expect(page.getByTestId('community-channel-following')).toHaveAttribute('aria-current', 'page')
  await expect(page.getByTestId('community-post-post_hanul_showcase_notice')).toContainText('已核实')
  await expect(page.getByTestId('community-post-post_iseo_window_note')).toContainText('已发布')
  await expect(page.locator('body')).not.toContainText(/[가-힯]/)

  await page.getByTestId('community-refresh').click()
  await expect(page.getByTestId('community-refresh-notice')).toContainText('未调用 AI')
  await expectNoCommunityOverflow(page)
  const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
  expect(result.violations.filter((violation) => violation.impact === 'critical')).toEqual([])
  expect(pageErrors).toEqual([])
})

test('claim labels, detail provenance, and source failure stay honest', async ({ page }) => {
  await seedCommunitySystem(page)
  await openCommunity(page)

  await page.getByTestId('community-channel-explore').click()
  const claimPost = page.getByTestId('community-post-post_room404_midnight_claim')
  await expect(claimPost).toContainText('未经证实')
  await expect(claimPost).toContainText('不是已确认事实')
  await claimPost.locator('.ripple-post__open').click()
  await expect(page.getByTestId('community-post-detail')).toContainText('帖文中的说法')
  await page.getByTestId('community-detail-back').click()

  await page.getByTestId('community-channel-news').click()
  const unavailable = page.getByTestId('community-post-post_radio_archive_unavailable')
  await expect(unavailable).toContainText('来源暂不可用')
  await unavailable.locator('.ripple-post__open').click()
  await expect(page.getByTestId('community-post-detail')).toContainText('未补写缺失内容')
  await expectNoCommunityOverflow(page)
})

test('bookmark, read state, and selected channel survive reload', async ({ page }) => {
  await seedCommunitySystem(page, { language: 'en-US' })
  await openCommunity(page)

  await page.getByTestId('community-channel-explore').click()
  await page.getByTestId('community-bookmark-post_long_form_city_night').click()
  await page.getByTestId('community-post-post_long_form_city_night').locator('.ripple-post__open').click()
  await expect(page.getByTestId('community-post-detail')).toContainText('How one public stage changes')
  await page.getByTestId('community-detail-back').click()
  await page.getByTestId('community-channel-bookmarks').click()
  await expect(page.getByTestId('community-post-post_long_form_city_night')).toBeVisible()

  await page.reload()
  await unlockToHome(page)
  await navigateInsideUnlockedApp(page, '/community')
  await expect(page.getByTestId('community-channel-bookmarks')).toHaveAttribute('aria-current', 'page')
  await expect(page.getByTestId('community-post-post_long_form_city_night')).toBeVisible()
  await expectNoCommunityOverflow(page)
})

test('zen theme keeps account and long-detail surfaces accessible', async ({ page }) => {
  const pageErrors = []
  page.on('pageerror', (error) => pageErrors.push(error.message))
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await seedCommunitySystem(page, { language: 'en-US', theme: 'zen' })
  await openCommunity(page)

  await expect(page.getByTestId('community-app')).toHaveClass(/is-night/)
  await page.getByTestId('community-channel-news').click()
  await page.getByTestId('community-post-post_long_form_city_night').locator('.ripple-post__open').click()
  await expect(page.getByTestId('community-post-detail')).toContainText('Checkable public sources')
  await page.getByTestId('community-detail-author').click()
  await expect(page.getByTestId('community-account-panel')).toContainText('Ripple Desk')
  await expectNoCommunityOverflow(page)
  const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
  expect(result.violations.filter((violation) => violation.impact === 'critical')).toEqual([])
  expect(pageErrors).toEqual([])
})
