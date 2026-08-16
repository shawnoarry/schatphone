import { chromium } from 'playwright'

const base = 'http://127.0.0.1:5199'
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 })

await page.goto(`${base}/#/lock`)
const englishUnlockButton = page.getByRole('button', { name: /Unlock to Home/ })
if (await englishUnlockButton.isVisible().catch(() => false)) {
  await englishUnlockButton.click()
} else {
  await page.locator('.lock-unlock-button').click()
}
await page.locator('.home-dock').waitFor({ timeout: 15000 })

await page.evaluate(() => { window.location.hash = '/food-delivery' })
await page.waitForFunction(
  () => document.querySelector('[data-testid="food-delivery-platform"], [data-testid="food-delivery-store-shell"]'),
  { timeout: 30000 },
).catch(() => console.log('ready selector timeout'))
await page.waitForTimeout(2500)
console.log('hash:', await page.evaluate(() => window.location.hash))
await page.screenshot({ path: 'artifacts/audit/ui-food-delivery.png' })

await browser.close()
console.log('done')
