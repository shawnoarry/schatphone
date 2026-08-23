import { expect, test } from '@playwright/test'
import { navigateInsideUnlockedApp, unlockToHome } from './helpers/navigation.js'

test.describe('Phone audio settings', () => {
  test('keeps phone mode audio in global Settings and away from Chat', async ({ page }) => {
    await unlockToHome(page)
    await navigateInsideUnlockedApp(page, '/settings')

    await page.getByTestId('settings-sound-entry').click()
    await expect(page.getByTestId('settings-call-audio')).toBeVisible()
    await expect(page.getByTestId('settings-ringtone')).toBeVisible()
    for (const ringtoneId of [
      'nokia-tone',
      'iphone-marimba',
      'old-phone-ring',
      'samsung-over-the-horizon',
      'sony-ericsson-morning-glow',
    ]) {
      await expect(
        page.getByTestId('settings-ringtone-select').locator(`option[value="${ringtoneId}"]`),
      ).toHaveCount(1)
    }
    const familiarRingtoneAssets = await page.evaluate(async () => {
      const files = [
        'audio/brand/nokia-tone.mp3',
        'audio/brand/iphone-marimba.mp3',
        'audio/brand/old-phone-ring.mp3',
        'audio/brand/sony-ericsson-morning-glow.mp3',
      ]
      return Promise.all(
        files.map(async (file) => {
          const url = new URL(file, document.baseURI).toString()
          const response = await fetch(url)
          const bytes = await response.arrayBuffer()
          const duration = await new Promise((resolve) => {
            const audio = new Audio(url)
            const timeoutId = window.setTimeout(() => resolve(0), 5_000)
            audio.preload = 'metadata'
            audio.addEventListener(
              'loadedmetadata',
              () => {
                window.clearTimeout(timeoutId)
                resolve(Number.isFinite(audio.duration) ? audio.duration : 0)
              },
              { once: true },
            )
            audio.addEventListener(
              'error',
              () => {
                window.clearTimeout(timeoutId)
                resolve(0)
              },
              { once: true },
            )
            audio.load()
          })
          return { file, ok: response.ok, size: bytes.byteLength, duration }
        }),
      )
    })
    expect(
      familiarRingtoneAssets.every(
        (asset) => asset.ok && asset.size > 10_000 && asset.duration > 1,
      ),
    ).toBe(true)
    await expect(
      page.getByTestId('settings-sound-select').locator('option[value="samsung-whistle"]'),
    ).toHaveCount(1)

    await page.getByTestId('settings-ringtone-select').selectOption('iphone-marimba')
    await page.getByTestId('settings-ringtone-preview').click()
    await page.getByTestId('settings-call-audio-select').selectOption('mobile-carrier')
    await page.getByTestId('settings-call-audio-toggle').click()
    await page.getByTestId('settings-sound-select').selectOption('samsung-whistle')
    await page.getByTestId('settings-haptics-toggle').click()

    const persisted = await page.evaluate(() => {
      const raw = window.localStorage.getItem('schatphone:store:system')
      return JSON.parse(raw || '{}')?.data?.settings?.appearance || {}
    })

    expect(persisted.callAudioProfile).toBe('mobile-carrier')
    expect(persisted.callAudioEnabled).toBe(false)
    expect(persisted.ringtoneId).toBe('iphone-marimba')
    expect(persisted.soundEffectsProfile).toBe('samsung-whistle')
    expect(persisted.hapticFeedbackEnabled).toBe(false)
    expect(persisted.chat?.soundEffectsProfile || '').toBe('')
  })

  test('collects haptics under the Sounds & Haptics entry and away from Appearance', async ({ page }) => {
    await unlockToHome(page)
    await navigateInsideUnlockedApp(page, '/settings')

    await page.getByTestId('settings-sound-entry').click()
    await expect(page.getByTestId('settings-haptics')).toBeVisible()
    await expect(page.getByTestId('settings-haptics-toggle')).toHaveAttribute('aria-checked', 'true')

    await page.getByTestId('settings-haptics-toggle').click()
    await expect(page.getByTestId('settings-haptics-toggle')).toHaveAttribute('aria-checked', 'false')
    await page.getByTestId('settings-haptics-toggle').click()
    await expect(page.getByTestId('settings-haptics-toggle')).toHaveAttribute('aria-checked', 'true')

    await navigateInsideUnlockedApp(page, '/appearance')
    await expect(page.getByText('触感反馈（振动）')).toHaveCount(0)
    await expect(page.getByText('Haptic Feedback (Vibration)')).toHaveCount(0)
  })
})
