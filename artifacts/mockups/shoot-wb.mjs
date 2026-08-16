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

await page.evaluate(() => { window.location.hash = '/worldbook' })
await page.getByTestId('worldbook-overview').waitFor({ timeout: 20000 })
await page.waitForTimeout(1000)

// 工作台区域（滚到工作台）
await page.getByTestId('world-setting-workspace').scrollIntoViewIfNeeded()
await page.waitForTimeout(400)
await page.screenshot({ path: 'artifacts/audit/wb-new-workspace.png' })

// 设定文本面板
await page.getByTestId('worldbook-panel-tab-sources').click()
await page.getByTestId('worldbook-book-sources').scrollIntoViewIfNeeded()
await page.waitForTimeout(400)
await page.screenshot({ path: 'artifacts/audit/wb-new-sources.png' })

// 打开来源选择 sheet
await page.getByTestId('worldbook-book-source-add').click()
await page.getByTestId('worldbook-source-picker').waitFor({ timeout: 8000 })
await page.waitForTimeout(400)
await page.screenshot({ path: 'artifacts/audit/wb-new-picker.png' })
await page.getByTestId('worldbook-source-picker-cancel').click()

// 百科面板
await page.getByTestId('worldbook-panel-tab-knowledge').click()
await page.waitForTimeout(500)
await page.screenshot({ path: 'artifacts/audit/wb-new-knowledge.png' })

await browser.close()
console.log('done')
