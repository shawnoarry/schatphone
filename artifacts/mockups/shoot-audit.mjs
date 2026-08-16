import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const base = 'http://127.0.0.1:5199'
const routes = [
  'home', 'chat', 'contacts', 'gallery', 'camera', 'phone', 'map',
  'calendar', 'reminders', 'wallet', 'worldbook', 'stock',
  'food-delivery', 'music', 'files', 'app-store', 'shopping',
  'settings', 'widgets', 'profile', 'appearance', 'network',
]

mkdirSync('artifacts/audit', { recursive: true })

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

for (const route of routes) {
  try {
    await page.evaluate((target) => { window.location.hash = `/${target}` }, route)
    await page.waitForTimeout(1400)
    await page.screenshot({ path: `artifacts/audit/ui-${route}.png` })
    console.log(`ok ${route}`)
  } catch (error) {
    console.log(`fail ${route}: ${error.message}`)
  }
}

await browser.close()
console.log('done')
