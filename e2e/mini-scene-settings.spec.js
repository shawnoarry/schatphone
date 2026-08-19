import { expect, test } from '@playwright/test'
import {
  navigateInsideUnlockedApp,
  unlockToHome,
} from './helpers/navigation.js'

test('global Settings persists Event Runtime Mini Scene presentation without Calendar authoring', async ({ page }) => {
  const pageErrors = []
  page.on('pageerror', (error) => pageErrors.push(error.message))

  await unlockToHome(page)
  await navigateInsideUnlockedApp(page, '/settings?menu=automation')

  const controls = page.getByTestId('settings-mini-scene-presentation-controls')
  const presentation = page.getByTestId('settings-mini-scene-presentation-simulation')
  await expect(controls).toBeVisible()
  await expect(controls).toContainText(/事件小剧场|Event Mini Scenes/)
  await expect(controls).toContainText(/内容由 AI 生成|AI generates its content/)
  await expect(presentation).toHaveValue('unconfigured')
  await expect(page.getByTestId('settings-mini-scene-presentation-calendar')).toHaveCount(0)

  await presentation.selectOption('text')
  await page.getByRole('button', { name: /保存自动响应设置|Save automation settings/ }).click()
  await expect(page.getByRole('button', { name: /已保存|Saved/ })).toBeVisible()

  await expect
    .poll(() =>
      page.evaluate(() => {
        const envelope = JSON.parse(
          window.localStorage.getItem('schatphone:store:mini-scene') || 'null',
        )
        return envelope?.data?.modulePolicies?.find(
          (policy) => policy.moduleKey === 'simulation',
        )?.mode || ''
      }),
    )
    .toBe('text')

  const overflow = await page.evaluate(() => ({
    document: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    body: document.body.scrollWidth - document.body.clientWidth,
  }))
  expect(overflow.document).toBeLessThanOrEqual(1)
  expect(overflow.body).toBeLessThanOrEqual(1)
  expect(pageErrors).toEqual([])
})
