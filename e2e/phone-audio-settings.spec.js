import { expect, test } from '@playwright/test'
import { navigateInsideUnlockedApp, unlockToHome } from './helpers/navigation.js'

test.describe('Phone audio settings', () => {
  test('keeps phone mode audio in global Settings and away from Chat', async ({ page }) => {
    await unlockToHome(page)
    await navigateInsideUnlockedApp(page, '/settings')

    await page.getByTestId('settings-sound-entry').click()
    await expect(page.getByTestId('settings-call-audio')).toBeVisible()
    await expect(page.getByTestId('settings-ringtone')).toBeVisible()
    await expect(
      page.getByTestId('settings-ringtone-select').locator('option[value="samsung-over-the-horizon"]'),
    ).toHaveCount(1)
    await expect(
      page.getByTestId('settings-sound-select').locator('option[value="samsung-whistle"]'),
    ).toHaveCount(1)

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
