import { chromium } from 'playwright'

const url = 'file:///H:/SchatPhone/schatphone/artifacts/mockups/book-store-concept.html'
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1060, height: 1080 }, deviceScaleFactor: 2 })
await page.goto(url)
await page.waitForTimeout(400)
await page.screenshot({ path: 'artifacts/mockups/book-store-concept.png', fullPage: true })
await browser.close()
console.log('done')
