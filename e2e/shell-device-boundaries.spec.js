import { expect, test } from '@playwright/test'
import {
  expectHomeReady,
  navigateInsideUnlockedApp,
  unlockToHome,
} from './helpers/navigation.js'

const portraitViewports = [
  { name: 'compact-320x568', width: 320, height: 568 },
  { name: 'short-360x640', width: 360, height: 640 },
  { name: 'classic-375x667', width: 375, height: 667 },
  { name: 'standard-390x844', width: 390, height: 844 },
  { name: 'wide-430x932', width: 430, height: 932 },
]

const landscapeViewport = { name: 'landscape-844x390', width: 844, height: 390 }

const seedEnglishLanguage = async (page) => {
  await page.addInitScript(() => {
    const now = Date.now()
    window.localStorage.setItem(
      'schatphone:store:system',
      JSON.stringify({
        version: 1,
        savedAt: now,
        data: { settings: { system: { language: 'en-US' } } },
      }),
    )
  })
}

const expectStableShell = async (page, viewport) => {
  const geometry = await page.evaluate(() => {
    const screen = document.querySelector('.screen')?.getBoundingClientRect()
    return {
      viewport: { width: window.innerWidth, height: window.innerHeight },
      screen: screen
        ? { left: screen.left, right: screen.right, top: screen.top, bottom: screen.bottom }
        : null,
      documentOverflow:
        document.documentElement.scrollWidth - document.documentElement.clientWidth,
      bodyOverflow: document.body.scrollWidth - document.body.clientWidth,
      bodyScrollX: window.scrollX,
    }
  })

  expect(geometry.viewport).toEqual({ width: viewport.width, height: viewport.height })
  expect(geometry.screen).not.toBeNull()
  expect(Math.abs(geometry.screen.left)).toBeLessThanOrEqual(1)
  expect(Math.abs(geometry.screen.top)).toBeLessThanOrEqual(1)
  expect(Math.abs(geometry.screen.right - viewport.width)).toBeLessThanOrEqual(1)
  expect(Math.abs(geometry.screen.bottom - viewport.height)).toBeLessThanOrEqual(1)
  expect(geometry.documentOverflow).toBeLessThanOrEqual(1)
  expect(geometry.bodyOverflow).toBeLessThanOrEqual(1)
  expect(geometry.bodyScrollX).toBe(0)
}

const expectControlInsideScreen = async (page, locator) => {
  await expect(locator).toBeVisible()
  const [controlBox, screenBox] = await Promise.all([
    locator.boundingBox(),
    page.locator('.screen').boundingBox(),
  ])
  expect(controlBox).not.toBeNull()
  expect(screenBox).not.toBeNull()
  expect(controlBox.x).toBeGreaterThanOrEqual(screenBox.x - 1)
  expect(controlBox.y).toBeGreaterThanOrEqual(screenBox.y - 1)
  expect(controlBox.x + controlBox.width).toBeLessThanOrEqual(screenBox.x + screenBox.width + 1)
  expect(controlBox.y + controlBox.height).toBeLessThanOrEqual(screenBox.y + screenBox.height + 1)
}

const expectNoVerticalOverlap = async (upperLocator, lowerLocator) => {
  if (!(await upperLocator.isVisible()) || !(await lowerLocator.isVisible())) return
  const [upperBox, lowerBox] = await Promise.all([
    upperLocator.boundingBox(),
    lowerLocator.boundingBox(),
  ])
  expect(upperBox).not.toBeNull()
  expect(lowerBox).not.toBeNull()
  expect(upperBox.y + upperBox.height).toBeLessThanOrEqual(lowerBox.y + 1)
}

const dragHorizontally = async (page) => {
  const { width } = page.viewportSize()
  await page.mouse.move(width * 0.65, 78)
  await page.mouse.down()
  await page.mouse.move(width * 0.35, 78, { steps: 8 })
  await page.mouse.up()
}

for (const viewport of [...portraitViewports, landscapeViewport]) {
  test(`Home stays usable at ${viewport.name}`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport)
    await seedEnglishLanguage(page)
    await unlockToHome(page)
    await expectStableShell(page, viewport)

    await expectControlInsideScreen(page, page.locator('.home-dock'))
    await expectControlInsideScreen(page, page.locator('.home-page-dots'))

    await page.evaluate(() => {
      window.location.hash = '/home?widgetEdit=1'
    })
    await expect(page.locator('.home-edit-topbar')).toBeVisible()
    await expectNoVerticalOverlap(
      page.locator('.home-edit-topbar'),
      page.locator('.home-recovery-cue'),
    )
    await expectNoVerticalOverlap(
      page.locator('.home-recovery-cue'),
      page.locator('.home-layout-toast'),
    )
    const activePage = page.locator('.home-page').nth(1)
    const activeGrid = activePage.locator('.home-grid')
    await activePage.evaluate((element) => {
      element.scrollTop = element.scrollHeight
    })
    const [pageBox, gridBox] = await Promise.all([
      activePage.boundingBox(),
      activeGrid.boundingBox(),
    ])
    expect(pageBox).not.toBeNull()
    expect(gridBox).not.toBeNull()
    expect(gridBox.y + gridBox.height).toBeLessThanOrEqual(pageBox.y + pageBox.height + 1)
    await expectControlInsideScreen(page, page.locator('.home-edit-topbar'))
    await expectControlInsideScreen(page, page.locator('.home-dock'))

    await testInfo.attach(`home-${viewport.name}.png`, {
      body: await page.screenshot({ animations: 'disabled' }),
      contentType: 'image/png',
    })
  })
}

const routeCases = [
  { name: 'Settings', route: '/settings', scroll: '.settings-scroll', back: '.settings-nav-button' },
  { name: 'Widgets', route: '/widgets', scroll: '.widgets-content', back: '.widgets-icon-btn' },
  { name: 'Wallet', route: '/wallet', scroll: '.wallet-content', back: '[data-testid="wallet-header-back"]' },
  { name: 'Map', route: '/map', scroll: '.map-canvas-shell', back: '.map-topbar-button' },
  { name: 'App Store', route: '/app-store', scroll: '.app-store-scroll', back: '.app-store-back' },
]

for (const routeCase of routeCases) {
  test(`${routeCase.name} keeps its return control inside the compact shell`, async ({ page }) => {
    const viewport = portraitViewports[0]
    await page.setViewportSize(viewport)
    await seedEnglishLanguage(page)
    await unlockToHome(page)
    await navigateInsideUnlockedApp(page, routeCase.route)

    const returnControl = page.locator(routeCase.back).first()
    await expectControlInsideScreen(page, returnControl)
    await page.locator(routeCase.scroll).first().evaluate((element) => {
      element.scrollTop = element.scrollHeight
    })
    await dragHorizontally(page)

    await expectStableShell(page, viewport)
    await expect(page).toHaveURL(new RegExp(`#${routeCase.route}(?:\\?|$)`))
    await expectControlInsideScreen(page, returnControl)
    await returnControl.click()
    await expectHomeReady(page)
  })
}
