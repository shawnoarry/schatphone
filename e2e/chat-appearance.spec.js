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

  expect(overflow.document, 'document should not overflow horizontally').toBeLessThanOrEqual(1)
  expect(overflow.body, 'body should not overflow horizontally').toBeLessThanOrEqual(1)
}

test('Chat Appearance carries an iMessage layout into the active conversation', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await unlockToHome(page)
  await navigateInsideUnlockedApp(page, '/chat-settings/appearance')

  await expect(page.getByTestId('chat-appearance-preview-legend')).toBeVisible()
  await expect(page.getByTestId('chat-appearance-preview-avatar-hint')).toContainText(/可替换|replaceable/i)

  const preview = page.getByTestId('chat-appearance-preview')
  await expect(preview.getByTestId('chat-appearance-preview-legend')).toHaveCount(0)
  await expect(preview.locator('.chat-appearance-preview__role-label')).toHaveCount(0)
  await expect(preview.locator('.chat-thread-header__hint')).toHaveCount(0)
  await expect(page.getByTestId('chat-appearance-preview-composer')).toBeVisible()
  await expect(page.getByTestId('chat-theme-color-preview-ocean')).toBeVisible()
  const compactMetrics = await page.evaluate(() => {
    const preview = document.querySelector('[data-testid="chat-appearance-preview"]')?.getBoundingClientRect()
    const layout = document.querySelector('[data-testid="chat-layout-option-kakao"]')?.getBoundingClientRect()
    const theme = document.querySelector('[data-testid="chat-theme-color-mode-layout"]')?.getBoundingClientRect()
    return {
      viewportHeight: window.innerHeight,
      previewTop: preview?.top || 0,
      previewBottom: preview?.bottom || 0,
      layoutTop: layout?.top || 0,
      layoutHeight: layout?.height || 0,
      themeHeight: theme?.height || 0,
    }
  })
  expect(compactMetrics.previewTop).toBeLessThan(compactMetrics.viewportHeight)
  expect(compactMetrics.previewBottom).toBeLessThanOrEqual(compactMetrics.layoutTop + 1)
  expect(compactMetrics.layoutHeight).toBeLessThanOrEqual(90)
  expect(compactMetrics.themeHeight).toBeLessThanOrEqual(90)
  const previewThread = page.getByTestId('chat-appearance-preview').locator('.chat-thread')
  await page.getByTestId('chat-theme-color-mode-ocean').click()
  await expect(page.getByTestId('chat-appearance-preview-summary')).toContainText(/海盐蓝|Sea blue/i)
  await expect
    .poll(async () => page.getByTestId('chat-appearance-preview').evaluate((element) => {
      const composer = element.querySelector('[data-testid="chat-appearance-preview-composer"]')
      const send = element.querySelector('.chat-appearance-preview__send')
      return {
        shell: window.getComputedStyle(element).backgroundColor,
        composer: composer ? window.getComputedStyle(composer).backgroundColor : '',
        send: send ? window.getComputedStyle(send).backgroundColor : '',
      }
    }))
    .toEqual({
      shell: 'rgb(203, 220, 242)',
      composer: 'rgb(248, 251, 255)',
      send: 'rgb(37, 99, 235)',
    })
  await page.getByTestId('chat-bubble-color-mode-theme').click()
  await page.getByTestId('chat-layout-option-imessage').click()
  const themeBubble = await preview
    .locator('.chat-message-row.is-user [data-testid="chat-message-bubble"]')
    .evaluate((element) => window.getComputedStyle(element).backgroundColor)
  expect(themeBubble).toBe('rgb(37, 99, 235)')
  await page.getByTestId('chat-bubble-color-mode-mono').click()
  await expect(preview).toHaveClass(/chat-theme-color-ocean/)
  await expect(preview).toHaveClass(/chat-bubble-color-mono/)
  await expect
    .poll(async () => previewThread.evaluate((element) => window.getComputedStyle(element).backgroundColor))
    .toBe('rgb(237, 244, 255)')
  const previewPalette = await preview.evaluate((element) => {
    const style = window.getComputedStyle(element)
    return {
      user: style.getPropertyValue('--chat-user-bubble-bg').trim(),
      assistant: style.getPropertyValue('--chat-assistant-bubble-bg').trim(),
    }
  })
  expect(previewPalette).toEqual({ user: '#111827', assistant: '#e5e7eb' })
  await page.getByTestId('chat-layout-option-kakao').click()
  await expect
    .poll(async () => previewThread.evaluate((element) => window.getComputedStyle(element).backgroundColor))
    .toBe('rgb(237, 244, 255)')
  await page.getByTestId('chat-layout-option-wechat').click()
  await expect
    .poll(async () => previewThread.evaluate((element) => window.getComputedStyle(element).backgroundColor))
    .toBe('rgb(237, 244, 255)')
  await page.getByTestId('chat-layout-option-imessage').click()
  await expect(page.getByTestId('chat-appearance-preview-header-avatar')).toBeVisible()
  await expect
    .poll(async () => previewThread.evaluate((element) => window.getComputedStyle(element).backgroundColor))
    .toBe('rgb(237, 244, 255)')
  await page.getByTestId('chat-theme-color-mode-layout').click()
  await page.getByTestId('chat-layout-option-kakao').click()
  await expect
    .poll(async () => previewThread.evaluate((element) => window.getComputedStyle(element).backgroundColor))
    .toBe('rgb(229, 237, 244)')
  await page.getByTestId('chat-layout-option-wechat').click()
  await expect
    .poll(async () => previewThread.evaluate((element) => window.getComputedStyle(element).backgroundColor))
    .toBe('rgb(237, 247, 236)')
  await page.getByTestId('chat-layout-option-imessage').click()
  await expect
    .poll(async () => previewThread.evaluate((element) => window.getComputedStyle(element).backgroundColor))
    .toBe('rgb(237, 241, 245)')
  await page.getByTestId('chat-theme-color-mode-ocean').click()
  await page.getByTestId('chat-appearance-custom-css-enabled').check()
  await page.getByTestId('chat-appearance-custom-css').fill('.chat-shell { --chat-bg: #e8f1ff; }')
  await page.getByTestId('chat-appearance-css-profile-name').fill('Frosted blue')
  await page.getByTestId('chat-appearance-css-profile-save').click()
  await expect(page.getByTestId('chat-appearance-css-profiles')).toBeVisible()
  await page.getByTestId('chat-appearance-custom-css-clear').click()
  await page.locator('[data-testid^="chat-appearance-css-profile-select-"]').first().click()
  await expect(page.getByTestId('chat-appearance-custom-css')).toHaveValue('.chat-shell { --chat-bg: #e8f1ff; }')
  const previewBubbleWidths = await page
    .locator('[data-testid^="chat-message-row-appearance-preview-"] [data-testid="chat-message-bubble"]')
    .evaluateAll((bubbles) => bubbles.map((bubble) => bubble.getBoundingClientRect().width))
  expect(previewBubbleWidths[0]).toBeGreaterThan(previewBubbleWidths[1] + 24)
  await page.getByTestId('chat-message-avatar-mode-all').click()
  await page.getByTestId('chat-message-bubble-mode-glass').click()
  await page.getByTestId('chat-appearance-save').click()
  await expectNoHorizontalOverflow(page)

  const themedChatPages = [
    { path: '/chat', testId: 'chat-page', surface: '.chat-home-sheet' },
    { path: '/chat-contacts?section=roles', testId: 'chat-directory-page', surface: '.chat-home-sheet' },
    { path: '/chat-groups', testId: 'chat-groups-page', surface: '.chat-home-sheet' },
    { path: '/chat-me', testId: 'chat-me-page', surface: '.chat-me-hero' },
    { path: '/chat-settings', testId: 'chat-settings-page', surface: '.chat-settings-hero' },
    { path: '/chat-settings/appearance', testId: 'chat-appearance-page', surface: '.chat-appearance-preview-panel' },
    { path: '/chat-feature/preferences', testId: 'chat-feature-page', surface: '.chat-native-header' },
  ]

  for (const entry of themedChatPages) {
    await navigateInsideUnlockedApp(page, entry.path)
    const themedPage = page.getByTestId(entry.testId)
    await expect(themedPage).toHaveClass(/chat-theme-color-ocean/)
    await expect(themedPage).toHaveClass(/chat-layout-imessage/)
    const themeState = await themedPage.evaluate((element, surfaceSelector) => {
      const style = window.getComputedStyle(element)
      const surface = element.querySelector(surfaceSelector)
      const surfaceStyle = surface ? window.getComputedStyle(surface) : null
      return {
        send: style.getPropertyValue('--chat-send-bg').trim(),
        pageBackground: style.getPropertyValue('--chat-page-bg').trim(),
        panelBackground: style.getPropertyValue('--chat-panel-bg').trim(),
        surfaceBackgroundColor: surfaceStyle?.backgroundColor || '',
        surfaceBackgroundImage: surfaceStyle?.backgroundImage || '',
      }
    }, entry.surface)
    expect(themeState.send).toBe('#2563eb')
    expect(themeState.pageBackground).not.toBe('')
    expect(themeState.panelBackground).not.toBe('')
    expect(
      themeState.surfaceBackgroundColor !== 'rgb(255, 255, 255)' ||
        themeState.surfaceBackgroundImage !== 'none',
    ).toBe(true)
    await expectNoHorizontalOverflow(page)
  }

  await navigateInsideUnlockedApp(page, '/chat/1')
  await expect(page.locator('.chat-shell')).toHaveClass(/chat-layout-imessage/)
  await expect(page.locator('.chat-shell')).toHaveClass(/chat-avatar-mode-all/)
  await expect(page.locator('.chat-shell')).toHaveClass(/chat-bubble-mode-glass/)
  await expect(page.locator('.chat-shell')).toHaveClass(/chat-theme-color-ocean/)
  await expect(page.locator('.chat-shell')).toHaveClass(/chat-bubble-color-mono/)
  const activePalette = await page.locator('.chat-shell').evaluate((element) => {
    const style = window.getComputedStyle(element)
    return {
      user: style.getPropertyValue('--chat-user-bubble-bg').trim(),
      assistant: style.getPropertyValue('--chat-assistant-bubble-bg').trim(),
    }
  })
  expect(activePalette).toEqual({ user: '#111827', assistant: '#e5e7eb' })
  const shellBackground = await page.locator('.chat-shell').evaluate((element) => {
    return window.getComputedStyle(element).backgroundColor
  })
  expect(shellBackground).toBe('rgb(232, 241, 255)')
  await expect(page.getByTestId('chat-thread-header-contact-avatar')).toBeVisible()
  await expect(page.getByTestId('chat-thread-header-note')).toHaveCount(0)

  await page.getByTestId('chat-message-input').fill('Appearance setting check.')
  await page.getByTestId('chat-message-input').press('Enter')
  const userMessage = page.locator('.chat-message-row.is-user').filter({ hasText: 'Appearance setting check.' })
  await expect(userMessage).toBeVisible()
  await expect(userMessage).toHaveAttribute('data-avatar-mode', 'all')
  await expect(userMessage).toHaveAttribute('data-bubble-mode', 'glass')
  await expect(userMessage.getByTestId('chat-message-avatar-self')).toBeVisible()
  const bubbleStyle = await userMessage.getByTestId('chat-message-bubble').evaluate((element) => {
    const style = window.getComputedStyle(element)
    return {
      backgroundColor: style.backgroundColor,
      borderTopWidth: style.borderTopWidth,
    }
  })
  expect(bubbleStyle.backgroundColor).not.toBe('rgba(0, 0, 0, 0)')
  expect(bubbleStyle.borderTopWidth).toBe('1px')

  const longMessageText = 'A deliberately long message that should wrap inside the bounded message column. '.repeat(8)
  await page.getByTestId('chat-message-input').fill(longMessageText)
  await page.getByTestId('chat-message-input').press('Enter')
  const longMessage = page.locator('.chat-message-row.is-user').last()
  await expect(longMessage).toBeVisible()
  const longBubbleMetrics = await longMessage.getByTestId('chat-message-bubble').evaluate((element) => {
    const bubble = element.getBoundingClientRect()
    const thread = element.closest('.chat-thread')?.getBoundingClientRect()
    return {
      right: bubble.right,
      width: bubble.width,
      threadRight: thread?.right || 0,
      threadWidth: thread?.width || 0,
    }
  })
  expect(longBubbleMetrics.right).toBeLessThanOrEqual(longBubbleMetrics.threadRight + 1)
  expect(longBubbleMetrics.width).toBeLessThan(longBubbleMetrics.threadWidth)
  await expectNoHorizontalOverflow(page)
})

test('Chat Appearance imports a custom CSS file into the draft', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await unlockToHome(page)
  await navigateInsideUnlockedApp(page, '/chat-settings/appearance')

  const cssContent = '.chat-shell { --chat-bg: #d8f3e8; }\n'
  await page.getByTestId('chat-appearance-custom-css-file').setInputFiles({
    name: 'mint-soda.css',
    mimeType: 'text/css',
    buffer: Buffer.from(cssContent, 'utf-8'),
  })

  await expect(page.getByTestId('chat-appearance-custom-css')).toHaveValue(/--chat-bg: #d8f3e8/)
  await expect(page.getByTestId('chat-appearance-custom-css-enabled')).toBeChecked()
  await expect(page.getByTestId('chat-appearance-css-profile-name')).toHaveValue('mint-soda')
  await expectNoHorizontalOverflow(page)
})
