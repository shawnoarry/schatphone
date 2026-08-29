import { expect, test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { navigateInsideUnlockedApp, unlockToHome } from './helpers/navigation.js'

test('Event Settings persists real runtime controls without Calendar authoring', async ({
  page,
}, testInfo) => {
  const pageErrors = []
  page.on('pageerror', (error) => pageErrors.push(error.message))

  await unlockToHome(page)
  await navigateInsideUnlockedApp(page, '/settings?menu=events')

  await expect(page.locator('.settings-subpage-title')).toContainText(/事件|Events/)
  await page.getByTestId('settings-simulation-surprise-mode').selectOption('high')
  await page.getByTestId('settings-simulation-module-events-map').uncheck()

  const controls = page.getByTestId('settings-mini-scene-presentation-controls')
  const presentation = page.getByTestId('settings-mini-scene-presentation-simulation')
  await expect(controls).toBeVisible()
  await expect(controls).toContainText(/事件小剧场|Event Mini Scenes/)
  await expect(controls).toContainText(/需要展开时请求 AI|asks AI to generate scenes/)
  await expect(presentation).toHaveValue('unconfigured')
  await expect(page.getByTestId('settings-mini-scene-presentation-calendar')).toHaveCount(0)

  await presentation.selectOption('text')

  await expect
    .poll(() =>
      page.evaluate(() => {
        const envelope = JSON.parse(
          window.localStorage.getItem('schatphone:store:simulation') || 'null',
        )
        return {
          surpriseMode: envelope?.data?.settings?.surpriseMode || '',
          mapEnabled: envelope?.data?.settings?.enabledModules?.map,
        }
      }),
    )
    .toEqual({ surpriseMode: 'high', mapEnabled: false })

  await expect
    .poll(() =>
      page.evaluate(() => {
        const envelope = JSON.parse(
          window.localStorage.getItem('schatphone:store:mini-scene') || 'null',
        )
        return (
          envelope?.data?.modulePolicies?.find((policy) => policy.moduleKey === 'simulation')
            ?.mode || ''
        )
      }),
    )
    .toBe('text')

  const accessibility = await new AxeBuilder({ page })
    .include('[data-testid="settings-simulation-runtime-controls"]')
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze()
  expect(accessibility.violations.filter((violation) => violation.impact === 'critical')).toEqual(
    [],
  )

  const overflow = await page.evaluate(() => ({
    document: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    body: document.body.scrollWidth - document.body.clientWidth,
  }))
  expect(overflow.document).toBeLessThanOrEqual(1)
  expect(overflow.body).toBeLessThanOrEqual(1)

  await testInfo.attach('settings-events.png', {
    body: await page.screenshot({ animations: 'disabled' }),
    contentType: 'image/png',
  })
  expect(pageErrors).toEqual([])
})
