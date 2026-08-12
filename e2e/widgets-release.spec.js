import { expect, test } from '@playwright/test'
import {
  openHomeDockApp,
  unlockToHome,
  waitForHashRoute,
} from './helpers/navigation.js'

const seedEnglishLanguage = async (page) => {
  await page.addInitScript(() => {
    if (window.top !== window) return
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
          },
        },
      }),
    )
  })
}

const openWidgetCenter = async (page) => {
  await seedEnglishLanguage(page)
  await unlockToHome(page)
  await openHomeDockApp(page, 'app_widgets', '/widgets')
}

test.describe('Widgets release flow', () => {
  test('uses the same built-in visual composition in Market and Home', async ({ page }, testInfo) => {
    await openWidgetCenter(page)

    const marketWeather = page.locator(
      '[data-testid="widgets-market-built-in-weather"] .built-in-widget-visual.is-weather',
    )
    await expect(marketWeather).toBeVisible()
    await expect(marketWeather).toContainText('24°')
    await testInfo.attach(`widgets-market-${testInfo.project.name}.png`, {
      body: await page.screenshot({ animations: 'disabled' }),
      contentType: 'image/png',
    })

    await page.locator('.widgets-section-head .widgets-secondary-btn').click()
    await waitForHashRoute(page, '/home')
    const homeWeather = page.locator('[data-home-tile-id="weather"] .built-in-widget-visual.is-weather')
    await expect(homeWeather).toBeVisible()
    await expect(homeWeather).toContainText('24°')
  })

  test('presents the expanded built-in size range and hands a large widget to Home', async ({
    page,
  }, testInfo) => {
    const pageErrors = []
    page.on('pageerror', (error) => pageErrors.push(error.message))
    await openWidgetCenter(page)

    const expectedVisuals = [
      ['focus_pulse', 'is-focus_pulse', 'FOCUS'],
      ['daily_steps', 'is-daily_steps', '6,842'],
      ['photo_note', 'is-photo_note', 'MOOD'],
      ['commute_strip', 'is-commute_strip', '18 min'],
      ['today_agenda', 'is-today_agenda', 'Design review'],
      ['week_rhythm', 'is-week_rhythm', 'SEVEN DAYS'],
      ['memory_board', 'is-memory_board', 'Keep today in color'],
      ['music_wave', 'is-music_wave', 'Evening Radio'],
      ['ambient_scene', 'is-ambient_scene', 'MORNING VEIL'],
      ['world_pulse', 'is-world_pulse', 'WORLD PULSE'],
    ]

    for (const [widgetId, variantClass, visibleCopy] of expectedVisuals) {
      const visual = page.locator(
        `[data-testid="widgets-market-built-in-${widgetId}"] .built-in-widget-visual.${variantClass}`,
      )
      await visual.scrollIntoViewIfNeeded()
      await expect(visual).toBeVisible()
      await expect(visual).toContainText(visibleCopy)
    }

    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth),
    ).toBe(true)
    await testInfo.attach(`widgets-expanded-market-${testInfo.project.name}.png`, {
      body: await page.screenshot({ animations: 'disabled', fullPage: true }),
      contentType: 'image/png',
    })

    await page.locator('[data-testid="widgets-built-in-action-week_rhythm"]').click()
    await waitForHashRoute(page, '/home')
    await expect(page.locator('.home-edit-topbar')).toBeVisible()
    const selectedWeekRhythm = page.locator(
      '[data-testid="home-library-candidate-week_rhythm"].is-active .built-in-widget-visual.is-week_rhythm',
    )
    await expect(selectedWeekRhythm).toBeVisible()
    await expect(selectedWeekRhythm).toContainText('SEVEN DAYS')
    expect(pageErrors).toEqual([])
  })

  test('restores preview focus and hands Home placement to edit mode', async ({ page }) => {
    const pageErrors = []
    page.on('pageerror', (error) => pageErrors.push(error.message))
    await openWidgetCenter(page)

    const previewButton = page
      .locator('.widgets-market-card.is-style-preset .widgets-preview-open')
      .first()
    await previewButton.focus()
    await previewButton.click()

    const previewDialog = page.locator('.widgets-style-preview-dialog')
    await expect(previewDialog).toBeVisible()
    await expect(previewDialog.locator('[data-dialog-initial-focus]')).toBeFocused()
    await page.keyboard.press('Escape')
    await expect(previewDialog).toBeHidden()
    await expect(previewButton).toBeFocused()

    await page.locator('.widgets-section-head .widgets-secondary-btn').click()
    await waitForHashRoute(page, '/home')
    await expect(page.locator('.home-edit-topbar')).toBeVisible()
    await expect(page.locator('.home-edit-topbar')).toContainText('Customize Home')
    await expect(page.locator('.home-edit-topbar')).toContainText('Done')
    expect(pageErrors).toEqual([])
  })

  test('blocks active code and keeps import feedback inside the editor', async ({
    page,
    isMobile,
  }) => {
    const pageErrors = []
    page.on('pageerror', (error) => pageErrors.push(error.message))
    await openWidgetCenter(page)
    await page.evaluate(() => {
      window.__widgetsReleaseExecuted = false
    })

    await page.locator('.widgets-home-btn').click()
    const customEditor = page.locator('.widgets-custom-composer')
    if (isMobile) {
      await expect(customEditor).toHaveAttribute('role', 'dialog')
      await expect(customEditor.locator('[data-dialog-initial-focus]')).toBeFocused()
    }

    await customEditor.locator('.widgets-code-toggle').click()
    await customEditor
      .locator('.widgets-code-editor textarea')
      .fill('<script>window.parent.__widgetsReleaseExecuted = true</script>')

    const draftFrame = customEditor.locator('.widgets-draft-preview iframe')
    await expect(draftFrame).toBeVisible()
    expect(await draftFrame.getAttribute('srcdoc')).not.toMatch(/<script/i)
    expect(await page.evaluate(() => window.__widgetsReleaseExecuted)).toBe(false)

    await customEditor.locator('.widgets-form-actions .widgets-primary-btn').click()
    await expect(customEditor.locator('.widgets-editor-feedback.is-error')).toContainText(
      'unsupported script content',
    )
    await expect(page.locator('.widgets-created-item')).toHaveCount(0)

    if (isMobile) await page.keyboard.press('Escape')
    await page.locator('#widgets-tab-import').click()

    const importOpenButton = page.locator(
      '#widgets-panel-import .widgets-mobile-action-strip .widgets-primary-btn',
    )
    if (isMobile) await importOpenButton.click()

    const importEditor = page.locator('.widgets-import-editor')
    if (isMobile) {
      await expect(importEditor).toHaveAttribute('role', 'dialog')
      await expect(importEditor.locator('[data-dialog-initial-focus]')).toBeFocused()
    }

    const importTextarea = importEditor.locator('.widgets-import-textarea')
    await importTextarea.fill('{')
    await expect(importEditor.locator('#widgets-import-editor-feedback')).toContainText(
      'Import content format is invalid.',
    )
    await expect(importTextarea).toHaveAttribute('aria-invalid', 'true')

    await importTextarea.fill(
      JSON.stringify([
        {
          name: 'Release Card',
          size: '2x2',
          code: '<div style="height:100%;display:grid;place-items:center">Ready</div>',
        },
      ]),
    )
    await importEditor.locator('.widgets-import-actions .widgets-primary-btn').click()
    await expect(page.locator('.widgets-feedback')).toContainText('Imported 1 widgets.')
    if (isMobile) {
      await expect(importEditor).not.toHaveAttribute('role', 'dialog')
      await expect(importOpenButton).toBeFocused()
    }

    await page.locator('[data-testid="widgets-feedback-choose-slot"]').click()
    const leaveDialog = page.locator('.app-dialog-panel')
    await expect(leaveDialog).toContainText('Leave Widget Center')
    await leaveDialog.getByRole('button', { name: 'Leave', exact: true }).click()
    await waitForHashRoute(page, '/home')
    await expect(page.locator('.home-edit-topbar')).toBeVisible()
    await expect(page.locator('.home-content-library-item.is-active')).toContainText('Release Card')
    if (isMobile) {
      const [topbarBox, libraryBox] = await Promise.all([
        page.locator('.home-edit-topbar').boundingBox(),
        page.locator('.home-content-library').boundingBox(),
      ])
      expect(libraryBox.y).toBeGreaterThanOrEqual(topbarBox.y + topbarBox.height)
    }
    const compatibleSlots = page.locator('.home-empty-slot-action.is-compatible')
    expect(await compatibleSlots.count()).toBeGreaterThan(0)
    expect(await compatibleSlots.evaluateAll((slots) => slots.map((slot) => slot.ariaLabel))).toEqual(
      expect.arrayContaining(['Place Release Card']),
    )

    expect(pageErrors).toEqual([])
  })
})
