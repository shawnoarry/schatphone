import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import {
  expectHomeReady,
  navigateInsideUnlockedApp,
  unlockToHome,
} from './helpers/navigation.js'

const surfaces = [
  { id: 'home', route: '/home' },
  { id: 'settings', route: '/settings' },
  { id: 'appearance', route: '/appearance' },
  { id: 'gallery', route: '/gallery' },
]

const themes = ['default', 'zen']

const seedSystemAppearance = async (page, theme) => {
  await page.addInitScript((currentTheme) => {
    const now = Date.now()
    window.localStorage.setItem(
      'schatphone:store:system',
      JSON.stringify({
        version: 1,
        savedAt: now,
        data: {
          settings: {
            system: {
              language: 'en-US',
            },
            appearance: {
              currentTheme,
              wallpaperMode: 'theme',
            },
          },
        },
      }),
    )
  }, theme)
}

const openSurface = async (page, surface) => {
  await unlockToHome(page)
  if (surface.route === '/home') {
    await expectHomeReady(page)
    return
  }
  await navigateInsideUnlockedApp(page, surface.route)
}

const expectNoHorizontalOverflow = async (page) => {
  const overflow = await page.evaluate(() => ({
    document: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    body: document.body.scrollWidth - document.body.clientWidth,
  }))

  expect(overflow.document, 'document should not overflow horizontally').toBeLessThanOrEqual(1)
  expect(overflow.body, 'body should not overflow horizontally').toBeLessThanOrEqual(1)
}

for (const theme of themes) {
  test.describe(`${theme} system theme`, () => {
    for (const surface of surfaces) {
      test(`${surface.id} produces visual QA evidence`, async ({ page }, testInfo) => {
        const pageErrors = []
        page.on('pageerror', (error) => pageErrors.push(error.message))

        await page.emulateMedia({ reducedMotion: 'reduce' })
        await seedSystemAppearance(page, theme)
        await openSurface(page, surface)

        await expect(page.locator('.app-shell')).toHaveAttribute('data-theme', theme)
        await expectNoHorizontalOverflow(page)

        const accessibility = await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
          .analyze()
        const criticalViolations = accessibility.violations.filter(
          (violation) => violation.impact === 'critical',
        )

        await testInfo.attach(`${surface.id}-${theme}-accessibility.json`, {
          body: Buffer.from(JSON.stringify(accessibility.violations, null, 2)),
          contentType: 'application/json',
        })
        await testInfo.attach(`${surface.id}-${theme}.png`, {
          body: await page.screenshot({ animations: 'disabled' }),
          contentType: 'image/png',
        })

        expect(pageErrors).toEqual([])
        expect(criticalViolations).toEqual([])
      })
    }
  })
}
