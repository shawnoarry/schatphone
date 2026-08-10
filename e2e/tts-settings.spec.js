import { expect, test } from '@playwright/test'
import { navigateInsideUnlockedApp, unlockToHome } from './helpers/navigation.js'

test('Chat voice settings expose MeloTTS and device-local MiniMax configuration', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      'schatphone:store:system',
      JSON.stringify({
        version: 1,
        savedAt: Date.now(),
        data: { settings: { system: { language: 'en-US' } } },
      }),
    )
  })
  await unlockToHome(page)
  await navigateInsideUnlockedApp(page, '/chat-settings')

  await page.getByTestId('chat-settings-entry-voice').click()
  await expect(page).toHaveURL(/#\/chat-settings\/voice$/)
  await expect(page.getByTestId('tts-cloudflare-endpoint')).toHaveValue('/api/tts/v1/speech')

  await page.getByTestId('tts-provider-minimax-speech').click()
  await expect(page.getByTestId('tts-model')).toHaveValue('speech-2.8-turbo')
  await page.getByTestId('tts-minimax-api-key').fill('e2e-device-key')
  await page.getByTestId('tts-minimax-api-key').press('Tab')

  const storage = await page.evaluate(() => ({
    config: window.localStorage.getItem('schatphone:tts:config'),
    credentials: window.localStorage.getItem('schatphone:tts:credentials'),
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  }))
  expect(storage.credentials).toContain('e2e-device-key')
  expect(storage.config).not.toContain('e2e-device-key')
  expect(storage.overflow).toBeLessThanOrEqual(1)
})
