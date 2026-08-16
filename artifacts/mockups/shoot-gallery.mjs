import { chromium } from 'playwright'

const base = 'http://127.0.0.1:5199'

const gallerySeed = {
  version: 1,
  savedAt: Date.now(),
  data: {
    assets: [
      { id: 'seed_nova1', name: 'Eva 练习室日常', category: 'reference', sourceType: 'url', sourceUrl: 'https://picsum.photos/seed/eva1/400/400', personIds: ['1'], placeId: '', placeText: '练习室', createdAt: 100, updatedAt: 100 },
      { id: 'seed_nova2', name: 'Eva 街拍', category: 'reference', sourceType: 'url', sourceUrl: 'https://picsum.photos/seed/eva2/400/400', personIds: ['1'], placeId: '', placeText: '', createdAt: 101, updatedAt: 101 },
      { id: 'seed_jackie1', name: 'Jackie 演出', category: 'reference', sourceType: 'url', sourceUrl: 'https://picsum.photos/seed/jackie1/400/400', personIds: ['2'], placeId: '', placeText: '音乐厅', createdAt: 102, updatedAt: 102 },
      { id: 'seed_place1', name: '汉江黄昏', category: 'scenario', sourceType: 'url', sourceUrl: 'https://picsum.photos/seed/river1/400/400', personIds: [], placeId: '', placeText: '汉江边', createdAt: 103, updatedAt: 103 },
      { id: 'seed_wp1', name: '雾蓝壁纸', category: 'wallpaper', sourceType: 'url', sourceUrl: 'https://picsum.photos/seed/wp1/400/400', personIds: [], placeId: '', placeText: '', createdAt: 104, updatedAt: 104 },
      { id: 'seed_sc1', name: '城市天台', category: 'scenario', sourceType: 'url', sourceUrl: 'https://picsum.photos/seed/sc1/400/400', personIds: [], placeId: '', placeText: '', createdAt: 105, updatedAt: 105 },
    ],
    folders: [
      { id: 'seed_folder1', name: '打歌舞台', category: 'all', assetIds: ['seed_jackie1', 'seed_sc1'], createdAt: 100, updatedAt: 100 },
    ],
  },
}

const browser = await chromium.launch()
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })
const page = await context.newPage()
await page.addInitScript((seed) => {
  localStorage.setItem('schatphone:store:gallery', JSON.stringify(seed))
}, gallerySeed)

await page.goto(`${base}/#/lock`)
const btn = page.getByRole('button', { name: /Unlock to Home/ })
if (await btn.isVisible().catch(() => false)) await btn.click(); else await page.locator('.lock-unlock-button').click()
await page.locator('.home-dock').waitFor({ timeout: 15000 })

await page.evaluate(() => { window.location.hash = '/gallery' })
await page.waitForTimeout(1500)
await page.screenshot({ path: 'artifacts/audit/gallery-new-library.png' })

await page.getByTestId('gallery-tab-albums').click()
await page.waitForTimeout(800)
await page.screenshot({ path: 'artifacts/audit/gallery-new-albums.png' })

await page.locator('.gallery-person-card').first().click()
await page.waitForTimeout(600)
await page.screenshot({ path: 'artifacts/audit/gallery-new-person.png' })

await page.locator('.gallery-cell').first().click()
await page.waitForTimeout(600)
await page.screenshot({ path: 'artifacts/audit/gallery-new-detail.png' })

await browser.close()
console.log('done')
