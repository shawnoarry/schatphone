import { chromium } from 'playwright'

const base = 'http://127.0.0.1:5199'
const routes = ['chat', 'contacts']

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 })
page.on('console', (msg) => { if (msg.type() === 'error') console.log('console.error:', msg.text().slice(0, 200)) })
page.on('pageerror', (err) => console.log('pageerror:', String(err).slice(0, 200)))

await page.goto(`${base}/#/lock`)
const englishUnlockButton = page.getByRole('button', { name: /Unlock to Home/ })
if (await englishUnlockButton.isVisible().catch(() => false)) {
  await englishUnlockButton.click()
} else {
  await page.locator('.lock-unlock-button').click()
}
await page.locator('.home-dock').waitFor({ timeout: 15000 })

for (const route of routes) {
  await page.evaluate((target) => { window.location.hash = `/${target}` }, route)
  await page.waitForFunction((target) => window.location.hash.endsWith(target), route, { timeout: 8000 }).catch(() => {})
  await page.waitForTimeout(2500)
  const hash = await page.evaluate(() => window.location.hash)
  console.log(`${route} -> ${hash}`)
  await page.screenshot({ path: `artifacts/audit/ui-${route}.png` })
}

await browser.close()
console.log('done')
