import { expect, test } from '@playwright/test'
import { navigateInsideUnlockedApp, unlockToHome } from './helpers/navigation.js'

test.use({
  trace: 'off',
  screenshot: 'only-on-failure',
  video: 'off',
})

const expectNoHorizontalOverflow = async (page) => {
  const overflow = await page.evaluate(() => ({
    document: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    body: document.body.scrollWidth - document.body.clientWidth,
  }))

  expect(overflow.document).toBeLessThanOrEqual(1)
  expect(overflow.body).toBeLessThanOrEqual(1)
}

const readShoppingBrandSources = async (page) => {
  await navigateInsideUnlockedApp(page, '/home?homePage=1')
  await page.getByTestId('home-folder-app_shopping').click()
  await expect(page.getByTestId('home-folder-overlay')).toBeVisible()
  const sources = await page
    .locator('[data-testid^="home-folder-entry-image-shop_app_shopping_"]')
    .evaluateAll((images) => images.map((image) => image.getAttribute('src')))
  await page.locator('.home-folder-panel-head button').click()
  return sources
}

const openAppIdentityEditor = async (page) => {
  const desktopAction = page.getByTestId('app-store-open-identity')
  if (await desktopAction.isVisible()) {
    await desktopAction.click()
    return
  }
  await page.getByTestId('app-store-open-identity-sheet').click()
}

test('Appearance switches system app icons while preserving commercial brand logos', async ({
  page,
}) => {
  const pageErrors = []
  page.on('pageerror', (error) => pageErrors.push(error.message))

  await page.emulateMedia({ reducedMotion: 'reduce' })
  await unlockToHome(page)

  await expect(page.getByTestId('home-dock-icon-app_chat').locator('i')).toHaveClass(/fa-comment/)
  const brandSourcesBefore = await readShoppingBrandSources(page)
  expect(brandSourcesBefore).toHaveLength(6)

  await navigateInsideUnlockedApp(page, '/appearance')
  await page.getByTestId('appearance-system-icons-entry').click()
  await expect(page.getByTestId('appearance-system-icons-page')).toBeVisible()
  await page.getByTestId('appearance-system-app-icon-theme-soft-rounded').click()
  await expect(
    page.getByTestId('appearance-system-app-icon-theme-soft-rounded'),
  ).toHaveAttribute('aria-pressed', 'true')
  await expectNoHorizontalOverflow(page)

  await navigateInsideUnlockedApp(page, '/home')
  await expect(page.getByTestId('home-dock-icon-app_chat').locator('i')).toHaveClass(/fa-comment/)
  await expect(page.getByTestId('home-dock-icon-app_contacts').locator('i')).toHaveClass(
    /fa-user-group/,
  )
  await expect(page.getByTestId('home-dock-icon-app_settings').locator('i')).toHaveClass(
    /fa-sliders/,
  )
  await expect(page.getByTestId('home-dock-icon-app_widgets').locator('i')).toHaveClass(/fa-grip/)
  await expect
    .poll(() =>
      page
        .locator('[data-testid^="home-dock-icon-app_"] i')
        .evaluateAll((icons) =>
          icons.every((icon) => {
            const content = getComputedStyle(icon, '::before').content
            return content && content !== 'none' && content !== 'normal' && content !== '""'
          }),
        ),
    )
    .toBe(true)

  const brandSourcesAfter = await readShoppingBrandSources(page)
  expect(brandSourcesAfter).toEqual(brandSourcesBefore)

  await page.reload()
  await unlockToHome(page)
  await expect(page.getByTestId('home-dock-icon-app_chat').locator('i')).toHaveClass(/fa-comment/)
  expect(pageErrors).toEqual([])
})

test('Appearance applies Cloud Animals images with classic fallback and persistence', async ({
  page,
}) => {
  const pageErrors = []
  page.on('pageerror', (error) => pageErrors.push(error.message))

  await page.emulateMedia({ reducedMotion: 'reduce' })
  await unlockToHome(page)
  await navigateInsideUnlockedApp(page, '/appearance')
  await page.getByTestId('appearance-system-icons-entry').click()

  const option = page.getByTestId(
    'appearance-system-app-icon-theme-cloud-pastel-animals',
  )
  await expect(option.locator('img')).toHaveCount(4)
  await option.click()
  await expect(option).toHaveAttribute('aria-pressed', 'true')

  await navigateInsideUnlockedApp(page, '/home')
  const settingsIcon = page.getByTestId('home-dock-icon-app_settings')
  await expect(settingsIcon.locator('img')).toHaveAttribute(
    'src',
    /cloud-pastel-animals-v1\/settings-gear-beetle\.webp/,
  )
  await expect(page.getByTestId('home-dock-icon-app_widgets').locator('img')).toHaveAttribute(
    'src',
    /cloud-pastel-animals-v1\/widgets-tile-shell-snail\.webp/,
  )
  await expect(settingsIcon).toHaveClass(/is-cloud-pastel-animal/)
  await expect
    .poll(() => settingsIcon.locator('img').evaluate((image) => getComputedStyle(image).filter))
    .toBe('none')
  await page.locator('html').evaluate((element) => element.setAttribute('data-color-mode', 'night'))
  await expect
    .poll(() => settingsIcon.locator('img').evaluate((image) => getComputedStyle(image).filter))
    .toContain('brightness(0.9)')
  await expect
    .poll(() => settingsIcon.evaluate((icon) => getComputedStyle(icon, '::after').backgroundColor))
    .toBe('rgba(18, 30, 52, 0.06)')
  await page.locator('html').evaluate((element) => element.setAttribute('data-color-mode', 'day'))
  await expect(page.getByTestId('home-dock-icon-app_contacts').locator('i')).toHaveClass(
    /fa-address-book/,
  )
  await expect(page.getByTestId('home-dock-icon-app_chat').locator('i')).toHaveClass(/fa-comment/)

  await page.reload()
  await unlockToHome(page)
  await expect(page.getByTestId('home-dock-icon-app_settings').locator('img')).toHaveAttribute(
    'src',
    /cloud-pastel-animals-v1\/settings-gear-beetle\.webp/,
  )
  await expectNoHorizontalOverflow(page)
  expect(pageErrors).toEqual([])
})

test('Chromatic Glass can temporarily lead over a saved system-app icon and restore it', async ({
  page,
}) => {
  const pageErrors = []
  page.on('pageerror', (error) => pageErrors.push(error.message))

  await page.emulateMedia({ reducedMotion: 'reduce' })
  await unlockToHome(page)
  await navigateInsideUnlockedApp(page, '/app-store')
  await page.getByTestId('app-store-item-app_widgets').click()
  await openAppIdentityEditor(page)
  await page.getByTestId('app-store-identity-display-name').fill('Clear Widgets')
  await page.getByTestId('app-store-identity-icon-preset').selectOption('fas fa-paper-plane')
  await page.getByTestId('app-store-identity-accent').selectOption('dark')
  await page.getByTestId('app-store-identity-save').click()

  await navigateInsideUnlockedApp(page, '/home')
  const widgetsIcon = page.getByTestId('home-dock-icon-app_widgets')
  await expect(widgetsIcon.locator('i')).toHaveClass(/fa-paper-plane/)
  await expect(widgetsIcon.locator('xpath=..')).toHaveAttribute('aria-label', 'Clear Widgets')

  await navigateInsideUnlockedApp(page, '/appearance')
  await page.getByTestId('appearance-system-icons-entry').click()
  await page.getByTestId('appearance-system-app-icon-theme-chromatic-glass').click()
  const priority = page.getByTestId('appearance-system-app-icon-theme-priority')
  await expect(priority).toHaveAttribute('aria-checked', 'false')
  await priority.click()
  await expect(priority).toHaveAttribute('aria-checked', 'true')

  await navigateInsideUnlockedApp(page, '/home')
  await expect(widgetsIcon).toHaveClass(/material-liquid-prism/)
  await expect(widgetsIcon.locator('svg')).toHaveCount(1)
  await expect(widgetsIcon.locator('xpath=..')).toHaveAttribute('aria-label', 'Clear Widgets')
  await expect(page.getByTestId('home-dock-icon-app_chat')).not.toHaveClass(
    /material-liquid-prism/,
  )

  await page.reload()
  await unlockToHome(page)
  await expect(page.getByTestId('home-dock-icon-app_widgets')).toHaveClass(/material-liquid-prism/)

  await navigateInsideUnlockedApp(page, '/appearance')
  await page.getByTestId('appearance-system-icons-entry').click()
  await page.getByTestId('appearance-system-app-icon-theme-priority').click()
  await navigateInsideUnlockedApp(page, '/home')
  await expect(page.getByTestId('home-dock-icon-app_widgets').locator('i')).toHaveClass(
    /fa-paper-plane/,
  )
  await expectNoHorizontalOverflow(page)
  expect(pageErrors).toEqual([])
})

test('Appearance keeps its theme axes independent and preserves a personal wallpaper', async ({
  page,
}) => {
  const pageErrors = []
  page.on('pageerror', (error) => pageErrors.push(error.message))

  await page.emulateMedia({ reducedMotion: 'reduce' })
  await unlockToHome(page)
  await navigateInsideUnlockedApp(page, '/appearance')
  await page.getByTestId('appearance-theme-entry').click()

  const dayMode = page.getByTestId('appearance-color-mode-day')
  const nightMode = page.getByTestId('appearance-color-mode-night')
  await expect(dayMode).toHaveAttribute('aria-pressed', 'true')
  await nightMode.click()
  await expect(nightMode).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('html')).toHaveAttribute('data-color-mode', 'night')

  await expect(page.getByTestId('appearance-system-theme-section')).toBeVisible()
  await expect(page.getByTestId('appearance-system-theme-classic')).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  const cloudPastelTheme = page.getByTestId('appearance-system-theme-cloud-pastel')
  await cloudPastelTheme.click()
  await expect(cloudPastelTheme).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('html')).toHaveAttribute('data-system-theme', 'cloud-pastel')
  await expect
    .poll(() => page.locator('.screen').evaluate((element) => element.style.backgroundImage))
    .toContain('cloud-pastel-night-v1.webp')

  await dayMode.click()
  await expect(dayMode).toHaveAttribute('aria-pressed', 'true')
  await expect
    .poll(() => page.locator('.screen').evaluate((element) => element.style.backgroundImage))
    .toContain('cloud-pastel-day-v1.webp')
  await nightMode.click()
  await expect(nightMode).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByTestId('appearance-style-kit-section')).toBeVisible()
  await expect(page.getByTestId('appearance-style-kit-system-classic')).toBeVisible()
  const cloudPastelKit = page.getByTestId('appearance-style-kit-cloud-pastel')
  await expect(cloudPastelKit).toBeVisible()

  await cloudPastelKit.click()
  await expect(page.locator('html')).toHaveAttribute('data-system-theme', 'cloud-pastel')
  await navigateInsideUnlockedApp(page, '/home')
  const nightSettingsIcon = page.getByTestId('home-dock-icon-app_settings')
  await expect(nightSettingsIcon.locator('img')).toHaveAttribute(
    'src',
    /cloud-pastel-animals-v1\/settings-gear-beetle\.webp/,
  )
  await navigateInsideUnlockedApp(page, '/appearance')
  await page.getByTestId('appearance-theme-entry').click()

  const personalWallpaperUrl = 'https://example.com/personal-wallpaper.png'
  await page.route(personalWallpaperUrl, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'image/svg+xml',
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>',
    }),
  )
  const wallpaperManager = page.getByTestId('appearance-wallpaper-manage')
  if (await wallpaperManager.isVisible()) {
    await wallpaperManager.click()
  }
  await page.getByTestId('appearance-wallpaper-image-source').selectOption('url')
  await page.getByTestId('appearance-wallpaper-image-url').fill(personalWallpaperUrl)
  await page.getByTestId('appearance-wallpaper-apply').click()

  const includeRecommendedWallpaper = page.getByTestId('appearance-style-kit-wallpaper')
  await expect(includeRecommendedWallpaper).not.toBeChecked()
  await page.getByTestId('appearance-style-kit-system-classic').click()
  await expect(page.getByTestId('appearance-style-kit-status')).toContainText(/已自定义|Customized/)

  await expect
    .poll(() =>
      page.evaluate(() => {
        const raw = window.localStorage.getItem('schatphone:store:system')
        return JSON.parse(raw || '{}')?.data?.settings?.appearance || {}
      }),
    )
    .toMatchObject({
      colorMode: 'night',
      currentTheme: 'zen',
      systemTheme: 'classic',
      systemAppIconTheme: 'classic',
      styleKitId: 'system-classic',
      wallpaperMode: 'url',
      wallpaper: personalWallpaperUrl,
    })

  await expectNoHorizontalOverflow(page)
  await page.reload()
  await unlockToHome(page)
  await navigateInsideUnlockedApp(page, '/appearance')
  await page.getByTestId('appearance-theme-entry').click()
  await expect(page.locator('html')).toHaveAttribute('data-color-mode', 'night')
  await expect(page.locator('html')).toHaveAttribute('data-system-theme', 'classic')
  await expect(page.getByTestId('appearance-style-kit-status')).toContainText(/已自定义|Customized/)
  await expectNoHorizontalOverflow(page)
  expect(pageErrors).toEqual([])
})

test('Chromatic Glass keeps the body clear and moves color into edge light', async ({ page }) => {
  const pageErrors = []
  page.on('pageerror', (error) => pageErrors.push(error.message))

  await page.emulateMedia({ reducedMotion: 'reduce' })
  await unlockToHome(page)
  await navigateInsideUnlockedApp(page, '/appearance')
  await page.getByTestId('appearance-theme-entry').click()
  await page.getByTestId('appearance-style-kit-chromatic-glass').click()

  await expect(page.locator('html')).toHaveAttribute('data-system-theme', 'chromatic-glass')
  await expect(page.locator('html')).toHaveAttribute('data-system-icon-theme', 'chromatic-glass')
  await expect(page.getByTestId('appearance-style-kit-status')).toContainText(/套装已应用|Kit Applied/)
  await expect
    .poll(() =>
      page
        .getByTestId('appearance-style-kit-chromatic-glass')
        .locator('.appearance-style-kit-option__action')
        .evaluate((action) => ({
          background: getComputedStyle(action).background,
          shadow: getComputedStyle(action).boxShadow,
        })),
    )
    .toMatchObject({
      background: expect.stringContaining('linear-gradient'),
      shadow: expect.stringContaining('inset'),
    })

  await navigateInsideUnlockedApp(page, '/home')
  const widgetsIcon = page.getByTestId('home-dock-icon-app_widgets')
  for (const appId of ['app_chat', 'app_contacts', 'app_settings', 'app_widgets']) {
    await expect(page.getByTestId(`home-dock-icon-${appId}`).locator('svg')).toHaveCount(1)
  }
  await expect(page.getByTestId('home-dock-icon-app_chat')).not.toHaveClass(
    /material-liquid-prism/,
  )
  await expect(widgetsIcon).toHaveClass(/material-liquid-prism/)
  await expect
    .poll(() =>
      widgetsIcon.evaluate((icon) => ({
        background: getComputedStyle(icon).background,
        border: getComputedStyle(icon).borderColor,
        edge: getComputedStyle(icon, '::after').backgroundImage,
        glyphFill: getComputedStyle(icon.querySelector('path')).fill,
        glyphStroke: getComputedStyle(icon.querySelector('path')).stroke,
      })),
    )
    .toMatchObject({
      background: expect.stringContaining('linear-gradient'),
      border: expect.stringContaining('rgba(255, 255, 255'),
      edge: expect.stringContaining('conic-gradient'),
      glyphFill: expect.stringContaining('rgba('),
      glyphStroke: 'none',
    })

  await navigateInsideUnlockedApp(page, '/appearance')
  await page.getByTestId('appearance-theme-entry').click()
  await page.getByTestId('appearance-color-mode-night').click()
  await expect(page.locator('html')).toHaveAttribute('data-color-mode', 'night')
  await expectNoHorizontalOverflow(page)
  expect(pageErrors).toEqual([])
})

test('Chromatic Glass optionally installs companion widgets without changing Home placement', async ({
  page,
}) => {
  const pageErrors = []
  page.on('pageerror', (error) => pageErrors.push(error.message))

  await page.emulateMedia({ reducedMotion: 'reduce' })
  await unlockToHome(page)

  const homeStateBefore = await page.evaluate(() => {
    const raw = window.localStorage.getItem('schatphone:store:system')
    const appearance = JSON.parse(raw || '{}')?.data?.settings?.appearance || {}
    return {
      homeWidgetPages: appearance.homeWidgetPages,
      homeLayoutSlotPlacements: appearance.homeLayoutSlotPlacements,
    }
  })

  await navigateInsideUnlockedApp(page, '/appearance')
  await page.getByTestId('appearance-theme-entry').click()
  const companionToggle = page.getByTestId('appearance-style-kit-widgets')
  await expect(companionToggle).not.toBeChecked()
  await expect(page.getByTestId('appearance-style-kit-liquid-prism')).toHaveCount(0)
  await companionToggle.check()
  await page.getByTestId('appearance-style-kit-chromatic-glass').click()

  await expect(page.locator('html')).toHaveAttribute('data-system-theme', 'chromatic-glass')
  await expect(page.locator('html')).toHaveAttribute(
    'data-system-icon-theme',
    'chromatic-glass',
  )
  await expect(page.getByTestId('appearance-style-kit-widget-feedback')).toContainText(
    /已将 5 个配套组件加入组件库|5 companion widgets were added/,
  )

  await expect
    .poll(() =>
      page.evaluate(() => {
        const raw = window.localStorage.getItem('schatphone:store:system')
        const appearance = JSON.parse(raw || '{}')?.data?.settings?.appearance || {}
        return {
          sourcePresetIds: (appearance.customWidgets || []).map(
            (widget) => widget.sourcePresetId,
          ),
          homeWidgetPages: appearance.homeWidgetPages,
          homeLayoutSlotPlacements: appearance.homeLayoutSlotPlacements,
        }
      }),
    )
    .toMatchObject({
      sourcePresetIds: expect.arrayContaining([
        'liquid_prism_drop',
        'liquid_prism_capsule',
        'liquid_prism_day',
        'liquid_prism_music',
        'liquid_prism_agenda',
      ]),
      ...homeStateBefore,
    })

  await navigateInsideUnlockedApp(page, '/home')
  await expect(page.getByTestId('home-dock-icon-app_contacts')).toHaveClass(
    /material-liquid-prism/,
  )
  await expect(page.getByTestId('home-dock-icon-app_chat')).not.toHaveClass(
    /material-liquid-prism/,
  )

  await page.reload()
  await unlockToHome(page)
  await expect(page.locator('html')).toHaveAttribute('data-system-theme', 'chromatic-glass')
  await expect(page.getByTestId('home-dock-icon-app_contacts')).toHaveClass(
    /material-liquid-prism/,
  )

  await navigateInsideUnlockedApp(page, '/widgets')
  await expect(page.getByTestId('widgets-style-preset-liquid_prism_drop')).toContainText(
    /创建副本|Create copy/,
  )
  await page.locator('#widgets-tab-custom').click()
  await expect(page.locator('.widgets-created-card')).toHaveCount(5)
  await expect(
    page.locator('.widgets-created-card').filter({ hasText: '彩光状态' }),
  ).toHaveCount(1)
  await expect(
    page.locator('.widgets-created-card').filter({ hasText: '彩光日程板' }),
  ).toHaveCount(1)

  const homeStateBeforeSwitch = await page.evaluate(() => {
    const raw = window.localStorage.getItem('schatphone:store:system')
    const appearance = JSON.parse(raw || '{}')?.data?.settings?.appearance || {}
    return {
      homeWidgetPages: appearance.homeWidgetPages,
      homeLayoutSlotPlacements: appearance.homeLayoutSlotPlacements,
    }
  })

  await navigateInsideUnlockedApp(page, '/appearance')
  await page.getByTestId('appearance-theme-entry').click()
  await page.getByTestId('appearance-style-kit-system-classic').click()
  await expect(page.locator('html')).toHaveAttribute('data-system-theme', 'classic')

  await expect
    .poll(() =>
      page.evaluate(() => {
        const raw = window.localStorage.getItem('schatphone:store:system')
        const appearance = JSON.parse(raw || '{}')?.data?.settings?.appearance || {}
        return {
          customWidgetCount: (appearance.customWidgets || []).length,
          homeWidgetPages: appearance.homeWidgetPages,
          homeLayoutSlotPlacements: appearance.homeLayoutSlotPlacements,
        }
      }),
    )
    .toEqual({ customWidgetCount: 5, ...homeStateBeforeSwitch })

  await expectNoHorizontalOverflow(page)
  expect(pageErrors).toEqual([])
})

test('App Store persists independent identities for Agenda Journey and Files', async ({ page }) => {
  const pageErrors = []
  page.on('pageerror', (error) => pageErrors.push(error.message))

  await page.emulateMedia({ reducedMotion: 'reduce' })
  await unlockToHome(page)
  await navigateInsideUnlockedApp(page, '/app-store')

  await page.getByTestId('app-store-item-app_agenda_journey').click()
  await openAppIdentityEditor(page)
  await page.getByTestId('app-store-identity-display-name').fill('Cloud Journey')
  await page.getByTestId('app-store-identity-save').click()

  await page.getByTestId('app-store-item-app_files').click()
  await openAppIdentityEditor(page)
  await page.getByTestId('app-store-identity-display-name').fill('Cloud Files')
  await page.getByTestId('app-store-identity-save').click()

  await expect
    .poll(() =>
      page.evaluate(() => {
        const raw = window.localStorage.getItem('schatphone:store:system')
        return JSON.parse(raw || '{}')?.data?.settings?.appearance?.appIconOverrides || {}
      }),
    )
    .toMatchObject({
      app_agenda_journey: { displayName: 'Cloud Journey' },
      app_files: { displayName: 'Cloud Files' },
    })

  await page.reload()
  await unlockToHome(page)
  await navigateInsideUnlockedApp(page, '/app-store')
  await expect(page.getByTestId('app-store-item-app_agenda_journey')).toContainText('Cloud Journey')
  await expect(page.getByTestId('app-store-item-app_files')).toContainText('Cloud Files')
  await expectNoHorizontalOverflow(page)
  expect(pageErrors).toEqual([])
})
