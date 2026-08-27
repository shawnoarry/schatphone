import { expect, test } from '@playwright/test'
import { navigateInsideUnlockedApp, unlockToHome } from './helpers/navigation.js'

const seedRetainedMiniScene = async (page, { language, colorMode }) => {
  await page.addInitScript(
    ({ language, colorMode }) => {
      window.localStorage.setItem(
        'schatphone:store:system',
        JSON.stringify({
          version: 1,
          savedAt: Date.now(),
          data: {
            settings: {
              system: { language, notifications: false, realPushEnabled: false },
              appearance: {
                currentTheme: colorMode === 'night' ? 'zen' : 'default',
                colorMode,
                wallpaperMode: 'theme',
              },
            },
          },
        }),
      )

      window.localStorage.setItem(
        'schatphone:store:mini-scene',
        JSON.stringify({
          version: 2,
          savedAt: Date.now(),
          data: {
            schemaVersion: 2,
            modulePolicies: [{ moduleKey: 'simulation', mode: 'text' }],
            profileBindings: [],
            artifacts: [
              {
                schemaVersion: 1,
                artifactId: 'event_e2e:mini_scene:ai:text:v1',
                requestId: 'event_e2e:mini_scene',
                source: {
                  moduleKey: 'simulation',
                  recordId: 'event_e2e',
                  eventId: 'event_e2e',
                },
                sceneType: 'event.runtime',
                worldId: 'legacy_single_world',
                profileId: '',
                profileVersion: 0,
                revision: 1,
                previousArtifactId: '',
                retention: { state: 'retained', retainedAt: Date.now(), archivedAt: 0 },
                content: {
                  title: language === 'en-US' ? 'The last rehearsal cue' : '最后一次彩排提示',
                  summary: language === 'en-US'
                    ? 'A saved production moment for the evening stage.'
                    : '为晚间舞台保存的一段制作现场。',
                  textFallback: language === 'en-US'
                    ? 'The cue light turns red while the stage manager counts down.'
                    : '提示灯转为红色，舞台经理开始倒数。',
                  beats: [],
                  choices: [
                    {
                      id: 'step_forward',
                      label: language === 'en-US' ? 'Step forward' : '向前一步',
                      value: 'step_forward',
                    },
                  ],
                  document: { templateId: '', variantId: '', slots: {}, assetIds: [] },
                },
                interactionState: { selectedChoiceId: '', closed: true },
                provenance: {
                  sourceKind: 'ai',
                  providerId: 'openai_compatible',
                  modelId: 'e2e-model',
                  requestId: 'e2e-provider-request',
                  generatedAt: Date.now(),
                },
              },
            ],
            interactionAudit: [],
          },
        }),
      )
    },
    { language, colorMode },
  )
}

test('manages explicitly retained Mini Scenes without owning the source event', async ({ page }, testInfo) => {
  const mobile = testInfo.project.name === 'mobile-chrome'
  const language = mobile ? 'en-US' : 'zh-CN'
  const colorMode = mobile ? 'night' : 'day'
  const pageErrors = []
  page.on('pageerror', (error) => pageErrors.push(error.message))

  await seedRetainedMiniScene(page, { language, colorMode })
  await unlockToHome(page)
  await navigateInsideUnlockedApp(page, '/control-center')

  const persistedMiniScene = await page.evaluate(() =>
    JSON.parse(window.localStorage.getItem('schatphone:store:mini-scene') || 'null'),
  )
  expect(persistedMiniScene?.data?.artifacts).toHaveLength(1)

  const manager = page.getByTestId('mini-scene-retention-manager')
  await expect(manager).toBeVisible()
  await expect(manager).toContainText(mobile ? 'Mini Scene Memories' : '小剧场回忆')
  await expect(page.getByTestId('mini-scene-history-item')).toHaveCount(1)
  await testInfo.attach(`mini-scene-history-${testInfo.project.name}.png`, {
    body: await page.screenshot({ fullPage: true }),
    contentType: 'image/png',
  })

  await page.getByTestId('mini-scene-history-open-event_e2e:mini_scene:ai:text:v1').click()
  const presenter = page.getByTestId('mini-scene-text-presenter')
  await expect(presenter).toBeVisible()
  await expect(presenter.getByRole('dialog')).toHaveAttribute('aria-modal', 'true')
  await expect(page.getByTestId('mini-scene-retain')).toBeDisabled()
  await testInfo.attach(`mini-scene-presenter-${testInfo.project.name}.png`, {
    body: await page.screenshot({ fullPage: false }),
    contentType: 'image/png',
  })
  await page.getByTestId('mini-scene-choice-step_forward').click()
  await page.getByTestId('mini-scene-close').click()
  await expect(presenter).toHaveCount(0)

  await page.getByTestId('mini-scene-history-archive-event_e2e:mini_scene:ai:text:v1').click()
  await page.getByTestId('mini-scene-history-filter-archived').click()
  await expect(page.getByTestId('mini-scene-history-item')).toHaveCount(1)
  await page.getByTestId('mini-scene-history-archive-event_e2e:mini_scene:ai:text:v1').click()

  await page.getByTestId('mini-scene-history-filter-retained').click()
  await page.getByTestId('mini-scene-history-delete-event_e2e:mini_scene:ai:text:v1').click()
  await page.getByRole('button', { name: mobile ? 'Delete scene' : '删除小剧场' }).click()
  await expect(page.getByTestId('mini-scene-history-item')).toHaveCount(0)

  const overflow = await page.evaluate(() => ({
    document: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    body: document.body.scrollWidth - document.body.clientWidth,
  }))
  expect(overflow.document).toBeLessThanOrEqual(1)
  expect(overflow.body).toBeLessThanOrEqual(1)
  expect(pageErrors).toEqual([])
})
