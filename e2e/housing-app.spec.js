import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { navigateInsideUnlockedApp, unlockToHome, waitForAppRouteReady } from './helpers/navigation.js'

const seedHousingSystem = async (page, { language = 'en-US', theme = 'default' } = {}) => {
  await page.addInitScript(({ language: targetLanguage, theme: targetTheme }) => {
    const seedKey = `schatphone:e2e:housing-system-seeded:${targetLanguage}:${targetTheme}`
    if (window.sessionStorage.getItem(seedKey) === '1') return
    window.localStorage.removeItem('schatphone:housing-shell:preview-state')
    window.localStorage.setItem(
      'schatphone:store:system',
      JSON.stringify({
        version: 1,
        savedAt: Date.now(),
        data: {
          settings: {
            system: { language: targetLanguage, notifications: false, realPushEnabled: false },
            appearance: { currentTheme: targetTheme, wallpaperMode: 'theme' },
          },
        },
      }),
    )
    window.sessionStorage.setItem(seedKey, '1')
  }, { language, theme })
}

const openHousingFromHome = async (page) => {
  await unlockToHome(page)
  await navigateInsideUnlockedApp(page, '/home?homePage=1')
  const tile = page.locator('[data-home-tile-id="app_jari_housing"]')
  await expect(tile).toBeVisible()
  await tile.evaluate((element) => element.click())
  await waitForAppRouteReady(page, '/housing')
}

const expectNoHousingOverflow = async (page) => {
  const overflow = await page.evaluate(() => {
    const target = document.querySelector('[data-testid="housing-app"]')
    return {
      document: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      body: document.body.scrollWidth - document.body.clientWidth,
      target: target instanceof HTMLElement ? target.scrollWidth - target.clientWidth : 0,
    }
  })
  expect(overflow.document).toBeLessThanOrEqual(1)
  expect(overflow.body).toBeLessThanOrEqual(1)
  expect(overflow.target).toBeLessThanOrEqual(1)
}

const expectHousingA11y = async (page) => {
  const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
  expect(result.violations.filter((violation) => violation.impact === 'critical')).toEqual([])
  expect(result.violations.filter((violation) => violation.id === 'color-contrast')).toEqual([])
}

const attachHousingScreenshot = async (page, testInfo, name) => {
  await testInfo.attach(`${name}-${testInfo.project.name}`, {
    body: await page.screenshot({ fullPage: false }),
    contentType: 'image/png',
  })
}

test('Jari opens from Home with a complete rent and buy browsing loop', async ({ page }, testInfo) => {
  const pageErrors = []
  page.on('pageerror', (error) => pageErrors.push(error.message))
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await seedHousingSystem(page)
  await openHousingFromHome(page)

  await expect(page.getByTestId('housing-listing-housing_listing_jari_001')).toContainText('south-facing studio')
  await page.getByTestId('housing-mode-buy').click()
  await expect(page.getByTestId('housing-listing-housing_listing_jari_005')).toContainText('₩3,980,000,000')
  await page.getByTestId('housing-mode-rent').click()
  await page.getByTestId('housing-search').fill('Mokdong')
  await expect(page.getByTestId('housing-listing-housing_listing_jari_002')).toBeVisible()
  await expect(page.getByTestId('housing-listing-housing_listing_jari_001')).toHaveCount(0)

  await expectNoHousingOverflow(page)
  await expectHousingA11y(page)
  expect(pageErrors).toEqual([])
  await attachHousingScreenshot(page, testInfo, 'jari-list')
})

test('listing detail uses a Map area reference without leaking a listing ID', async ({ page }, testInfo) => {
  const pageErrors = []
  page.on('pageerror', (error) => pageErrors.push(error.message))
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await seedHousingSystem(page)
  await openHousingFromHome(page)

  await page.getByTestId('housing-listing-housing_listing_jari_004').locator('.jari-listing__body').click()
  await expect(page.getByTestId('housing-listing-detail')).toContainText('NO LISTING IMAGE')
  await expect(page.getByTestId('housing-listing-detail')).toContainText('Jagok-ro')
  await attachHousingScreenshot(page, testInfo, 'jari-no-image-detail')
  await page.getByTestId('housing-open-map').click()
  await waitForAppRouteReady(page, '/map')
  const hashQuery = new URLSearchParams(new URL(page.url()).hash.split('?')[1] || '')
  expect(hashQuery.get('source')).toBe('housing')
  expect(hashQuery.get('mapPackId')).toBe('real-seoul-v1')
  expect(hashQuery.get('placeId')).toBe('seoul-lh-gangnam-complex-3')
  expect(hashQuery.has('listingId')).toBe(false)
  expect(pageErrors).toEqual([])
})

test('viewing drafts save, reschedule, cancel, and survive reload inside Jari only', async ({ page }, testInfo) => {
  const pageErrors = []
  page.on('pageerror', (error) => pageErrors.push(error.message))
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await seedHousingSystem(page)
  await openHousingFromHome(page)

  await page.getByTestId('housing-listing-housing_listing_jari_001').locator('.jari-listing__body').click()
  await page.getByTestId('housing-viewing-open').click()
  await expect(page.getByTestId('housing-viewing-sheet')).toContainText('not a confirmed appointment')
  await page.getByTestId('housing-viewing-note').fill('Check the afternoon light and elevator noise.')
  await page.getByTestId('housing-viewing-save').click()
  await expect(page.getByTestId('housing-notice')).toContainText('saved in Jari')

  await page.getByTestId('housing-detail-back').click()
  await page.getByTestId('housing-section-viewings').click()
  const row = page.getByTestId('housing-viewing-row-housing_listing_jari_001')
  await expect(row).toContainText('Check the afternoon light')
  await page.reload()
  await unlockToHome(page)
  await navigateInsideUnlockedApp(page, '/housing?homePage=1&from=home')
  await page.getByTestId('housing-section-viewings').click()
  await expect(row).toContainText('Check the afternoon light')

  await page.getByTestId('housing-viewing-edit-housing_listing_jari_001').click()
  await page.locator('input[name="viewing-slot"]').nth(2).check()
  await page.getByTestId('housing-viewing-save').click()
  await page.getByTestId('housing-viewing-row-cancel-housing_listing_jari_001').click()
  await expect(row).toContainText('Cancelled local draft')
  await expectNoHousingOverflow(page)
  await expectHousingA11y(page)
  expect(pageErrors).toEqual([])
  await attachHousingScreenshot(page, testInfo, 'jari-viewing-draft')
})

test('Chinese zen mode keeps long prices, source failures, and controls readable', async ({ page }, testInfo) => {
  const pageErrors = []
  page.on('pageerror', (error) => pageErrors.push(error.message))
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await seedHousingSystem(page, { language: 'zh-CN', theme: 'zen' })
  await openHousingFromHome(page)

  await expect(page.getByTestId('housing-app')).not.toHaveClass(/night/)
  const ground = await page.getByTestId('housing-app').evaluate((el) => getComputedStyle(el).backgroundColor)
  expect(ground).toBe('rgb(241, 238, 230)')
  await expect(page.getByTestId('housing-app')).toContainText('寻找住处')
  await page.getByTestId('housing-mode-buy').click()
  await page.getByTestId('housing-listing-housing_listing_jari_006').locator('.jari-listing__body').click()
  await expect(page.getByTestId('housing-source-state')).toContainText('来源暂时不可用')
  await expect(page.getByTestId('housing-listing-detail')).toContainText('148 亿韩元')
  await expect(page.getByTestId('housing-listing-detail')).toContainText('具体楼栋信息仅在房源来源恢复后提供')
  await expect(page.getByTestId('housing-viewing-open')).toBeDisabled()
  await expect(page.getByTestId('housing-app')).not.toContainText(/[가-힣]/)

  await expectNoHousingOverflow(page)
  await expectHousingA11y(page)
  expect(pageErrors).toEqual([])
  await attachHousingScreenshot(page, testInfo, 'jari-zen-unavailable')
})
