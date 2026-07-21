import { expect, test } from '@playwright/test'
import { navigateInsideUnlockedApp, unlockToHome } from './helpers/navigation.js'

const themes = ['default', 'zen']
const longUserName = 'AlexandriaMontgomeryInternationalProfileWithoutBreaks'

const seedSettingsLanding = async (page, theme) => {
  await page.addInitScript(
    ({ currentTheme, userName }) => {
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
            user: {
              name: userName,
            },
          },
        }),
      )
    },
    { currentTheme: theme, userName: longUserName },
  )
}

const expectNoHorizontalOverflow = async (page) => {
  const overflow = await page.evaluate(() => ({
    document: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    body: document.body.scrollWidth - document.body.clientWidth,
  }))

  expect(overflow.document, 'document should not overflow horizontally').toBeLessThanOrEqual(1)
  expect(overflow.body, 'body should not overflow horizontally').toBeLessThanOrEqual(1)
}

const expectChildrenContained = async (locator, childSelector) => {
  const result = await locator.evaluate((element, selector) => {
    const container = element.getBoundingClientRect()
    const tolerance = 1
    return [...element.querySelectorAll(selector)].every((child) => {
      const bounds = child.getBoundingClientRect()
      return (
        bounds.left >= container.left - tolerance &&
        bounds.right <= container.right + tolerance &&
        bounds.top >= container.top - tolerance &&
        bounds.bottom <= container.bottom + tolerance
      )
    })
  }, childSelector)

  expect(result, `${childSelector} should stay inside its interactive container`).toBe(true)
}

const rectanglesOverlap = (first, second) =>
  first.left < second.right &&
  first.right > second.left &&
  first.top < second.bottom &&
  first.bottom > second.top

const expectVisibleFocus = async (locator) => {
  await expect(locator).toBeFocused()
  const focusStyle = await locator.evaluate((element) => {
    const style = window.getComputedStyle(element)
    return {
      outlineStyle: style.outlineStyle,
      outlineWidth: Number.parseFloat(style.outlineWidth),
    }
  })
  expect(focusStyle.outlineStyle).not.toBe('none')
  expect(focusStyle.outlineWidth).toBeGreaterThanOrEqual(2)
}

for (const theme of themes) {
  test(`${theme} Settings landing keeps long content and focus states stable`, async ({
    page,
  }, testInfo) => {
    const pageErrors = []
    page.on('pageerror', (error) => pageErrors.push(error.message))

    await page.emulateMedia({ reducedMotion: 'reduce' })
    await seedSettingsLanding(page, theme)
    await unlockToHome(page)
    await navigateInsideUnlockedApp(page, '/settings')

    await expect(page.locator('.app-shell')).toHaveAttribute('data-theme', theme)
    await expectNoHorizontalOverflow(page)

    const profile = page.getByTestId('settings-profile-entry')
    const quickAccess = page.locator('[data-settings-quick-title]')
    const menuItems = page.locator('[data-settings-menu-title]')

    await expect(profile).toContainText(longUserName)
    await expect(profile).toHaveAttribute('type', 'button')
    await expect(quickAccess).toHaveCount(3)
    await expect(menuItems).toHaveCount(5)

    for (const button of await quickAccess.all()) {
      await expect(button).toHaveAttribute('type', 'button')
      await expectChildrenContained(button, 'p')
    }

    for (const button of await menuItems.all()) {
      await expect(button).toHaveAttribute('type', 'button')
      await expectChildrenContained(button, '.settings-menu-copy, .settings-menu-chevron')
    }

    const profileLayout = await profile.evaluate((element) => {
      const toRect = (bounds) => ({
        top: bounds.top,
        right: bounds.right,
        bottom: bounds.bottom,
        left: bounds.left,
      })
      return {
        avatar: toRect(element.querySelector('.settings-profile-avatar').getBoundingClientRect()),
        copy: toRect(element.querySelector('.settings-profile-copy').getBoundingClientRect()),
        chevron: toRect(element.querySelector('.settings-profile-chevron').getBoundingClientRect()),
      }
    })

    expect(rectanglesOverlap(profileLayout.avatar, profileLayout.copy)).toBe(false)
    expect(rectanglesOverlap(profileLayout.copy, profileLayout.chevron)).toBe(false)
    await expectChildrenContained(
      profile,
      '.settings-profile-avatar, .settings-profile-copy, .settings-profile-chevron',
    )

    let profileFocused = false
    for (let index = 0; index < 8 && !profileFocused; index += 1) {
      await page.keyboard.press('Tab')
      profileFocused = await profile.evaluate((element) => document.activeElement === element)
    }
    expect(profileFocused, 'profile entry should be reachable with the keyboard').toBe(true)
    await expectVisibleFocus(profile)

    await testInfo.attach(`settings-profile-focus-${theme}.png`, {
      body: await page.screenshot({ animations: 'disabled' }),
      contentType: 'image/png',
    })

    await page.keyboard.press('Tab')
    await expectVisibleFocus(quickAccess.first())
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')
    await expectVisibleFocus(menuItems.first())

    const profileBoundsBeforePress = await profile.boundingBox()
    await profile.hover()
    await page.mouse.down()
    const profileBoundsWhilePressed = await profile.boundingBox()
    await page.mouse.move(0, 0)
    await page.mouse.up()
    expect(profileBoundsWhilePressed?.width).toBe(profileBoundsBeforePress?.width)
    expect(profileBoundsWhilePressed?.height).toBe(profileBoundsBeforePress?.height)
    await expect(page).toHaveURL(/#\/settings(?:\?|$)/)

    await testInfo.attach(`settings-landing-${theme}.png`, {
      body: await page.screenshot({ animations: 'disabled' }),
      contentType: 'image/png',
    })

    await page.getByTestId('settings-software-update-entry').click()
    const subpageBack = page.getByTestId('settings-subpage-back')
    const subpageBackLabel = page.locator('.settings-subpage-back-label')
    const subpageTitle = page.locator('.settings-subpage-title')
    await expect(subpageBack).toHaveAttribute('type', 'button')
    await expect(subpageBackLabel).toHaveText('Settings')
    await expect(subpageTitle).toContainText('Software Update')

    await subpageBack.focus()
    await page.keyboard.press('Tab')
    await page.keyboard.press('Shift+Tab')
    await expectVisibleFocus(subpageBack)

    const headerLayout = await page.locator('.settings-subpage-header').evaluate((element) => {
      const toRect = (bounds) => ({
        top: bounds.top,
        right: bounds.right,
        bottom: bounds.bottom,
        left: bounds.left,
      })
      const backLabel = element.querySelector('.settings-subpage-back-label')
      const backLabelStyle = window.getComputedStyle(backLabel)
      const backLabelRange = document.createRange()
      backLabelRange.selectNodeContents(backLabel)
      const backLabelLineRects = [...backLabelRange.getClientRects()].filter(
        (bounds) => bounds.width > 0 && bounds.height > 0,
      )
      return {
        back: toRect(element.querySelector('.settings-subpage-back').getBoundingClientRect()),
        backLabel: toRect(backLabel.getBoundingClientRect()),
        backLabelLineCount: backLabelLineRects.length,
        backLabelText: backLabel.textContent.trim(),
        backLabelClientWidth: backLabel.clientWidth,
        backLabelHeight: backLabel.getBoundingClientRect().height,
        backLabelLineHeight: Number.parseFloat(backLabelStyle.lineHeight),
        backLabelScrollWidth: backLabel.scrollWidth,
        title: toRect(element.querySelector('.settings-subpage-title').getBoundingClientRect()),
      }
    })
    expect(headerLayout.backLabelText).toBe('Settings')
    expect(headerLayout.backLabelLineCount, 'back label should render on one line').toBe(1)
    expect(headerLayout.backLabelHeight).toBeLessThanOrEqual(headerLayout.backLabelLineHeight + 1)
    expect(headerLayout.backLabelScrollWidth).toBeLessThanOrEqual(
      headerLayout.backLabelClientWidth + 1,
    )
    expect(rectanglesOverlap(headerLayout.backLabel, headerLayout.title)).toBe(false)
    expect(rectanglesOverlap(headerLayout.back, headerLayout.title)).toBe(false)
    await expectChildrenContained(subpageBack, '.settings-subpage-back-label')
    await expectChildrenContained(
      page.locator('.settings-subpage-header'),
      '.settings-subpage-back, .settings-subpage-title',
    )

    await testInfo.attach(`settings-subpage-header-${theme}.png`, {
      body: await page.screenshot({ animations: 'disabled' }),
      contentType: 'image/png',
    })

    expect(pageErrors).toEqual([])
  })
}
