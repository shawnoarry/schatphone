import { chromium } from 'playwright'

const base = 'http://127.0.0.1:5199'
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 })

await page.goto(`${base}/#/lock`)
const btn = page.getByRole('button', { name: /Unlock to Home/ })
if (await btn.isVisible().catch(() => false)) await btn.click(); else await page.locator('.lock-unlock-button').click()
await page.locator('.home-dock').waitFor({ timeout: 15000 })

await page.evaluate(() => { window.location.hash = '/worldbook' })
await page.getByTestId('worldbook-overview').waitFor({ timeout: 20000 })
await page.waitForTimeout(800)
await page.screenshot({ path: 'artifacts/audit/copy-wb-overview.png' })

await page.evaluate(() => { window.location.hash = '/reminders' })
await page.waitForTimeout(1200)
await page.screenshot({ path: 'artifacts/audit/copy-reminders.png' })

await page.evaluate(() => { window.location.hash = '/book' })
await page.getByTestId('book-library').waitFor({ timeout: 15000 })
await page.waitForTimeout(800)
await page.screenshot({ path: 'artifacts/audit/copy-book.png' })

await browser.close()
console.log('done')
