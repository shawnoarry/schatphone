import { chromium } from 'playwright'

const base = 'http://127.0.0.1:5199'
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1280, height: 860 }, deviceScaleFactor: 2 })

await page.goto(`${base}/#/lock`)
const englishUnlockButton = page.getByRole('button', { name: /Unlock to Home/ })
if (await englishUnlockButton.isVisible().catch(() => false)) {
  await englishUnlockButton.click()
} else {
  await page.locator('.lock-unlock-button').click()
}
await page.locator('.home-dock').waitFor({ timeout: 15000 })

await page.evaluate(() => { window.location.hash = '/book' })
await page.getByTestId('book-library').waitFor({ timeout: 15000 })
await page.waitForTimeout(600)
await page.screenshot({ path: 'artifacts/mockups/book-live-shelf.png' })

// 点进第一本书看详情
await page.locator('[data-testid^="book-asset-"]').first().click()
await page.waitForTimeout(600)
await page.screenshot({ path: 'artifacts/mockups/book-live-detail.png' })

await browser.close()
console.log('done')
