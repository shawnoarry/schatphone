import { expect, test } from '@playwright/test'
import { openHomeDockApp, unlockToHome, waitForAppRouteReady } from './helpers/navigation.js'

const onePixelPng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9ZlS8AAAAASUVORK5CYII=',
  'base64',
)

const resolveLockUrl = (testInfo) => {
  const base = new URL(String(testInfo.project.use.baseURL))
  if (
    testInfo.project.name === 'mobile-chrome' &&
    ['127.0.0.1', 'localhost'].includes(base.hostname)
  ) {
    base.hostname = base.hostname === '127.0.0.1' ? 'localhost' : '127.0.0.1'
  }
  base.hash = '/lock'
  return base.toString()
}

const openDefaultThread = async (page, testInfo) => {
  await unlockToHome(page, resolveLockUrl(testInfo))
  await openHomeDockApp(page, 'app_chat', '/chat')
  await page.getByTestId('chat-contact-row-1').click()
  await waitForAppRouteReady(page, '/chat/1')
}

const chooseFile = async (page, launcherTestId, file) => {
  const chooserPromise = page.waitForEvent('filechooser')
  await page.getByTestId(launcherTestId).click()
  const chooser = await chooserPromise
  await chooser.setFiles(file)
}

const expectChatNoHorizontalOverflow = async (page) => {
  const overflow = await page.evaluate(() => ({
    document: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    body: document.body.scrollWidth - document.body.clientWidth,
    chat: (() => {
      const element = document.querySelector('[data-testid="chat-page"]')
      return element instanceof HTMLElement ? element.scrollWidth - element.clientWidth : 0
    })(),
  }))
  expect(overflow.document).toBeLessThanOrEqual(1)
  expect(overflow.body).toBeLessThanOrEqual(1)
  expect(overflow.chat).toBeLessThanOrEqual(1)
}

test('voice rich card keeps structured edit behavior', async ({ page }, testInfo) => {
  await openDefaultThread(page, testInfo)

  await page.getByTestId('chat-user-action-toggle').click()
  await page.getByTestId('chat-user-action-open-voice').click()
  await page.getByTestId('chat-user-action-voice-transcript').fill('Meet at eight by the studio.')
  await page.getByTestId('chat-user-action-voice-duration').fill('14')
  await page.getByTestId('chat-user-action-submit-voice').click()

  const voiceRow = page
    .getByTestId(/^chat-message-row-/)
    .filter({ hasText: 'Meet at eight by the studio.' })
    .last()
  await expect(voiceRow.locator('[data-block-type="voice_virtual"]')).toContainText('0:14')
  await voiceRow.getByTestId('chat-message-bubble').click({ button: 'right' })
  await expect(page.getByTestId('chat-message-action-edit')).toBeVisible()
  await page.getByTestId('chat-message-action-edit').click()

  await expect(page.getByTestId('chat-message-edit-field-transcript')).toHaveValue(
    'Meet at eight by the studio.',
  )
  await page.getByTestId('chat-message-edit-field-transcript').fill('Meet at nine by the studio.')
  await page.getByTestId('chat-message-edit-field-durationSec').fill('21')
  await page.getByTestId('chat-message-edit-save').click()

  const editedVoice = page
    .locator('[data-block-type="voice_virtual"]')
    .filter({ hasText: 'Meet at nine by the studio.' })
    .last()
  await expect(editedVoice).toContainText('0:21')
  await expect(page.locator('body')).not.toContainText('Meet at eight by the studio.')
  await expectChatNoHorizontalOverflow(page)
})

test('media picker recovers from type and size errors, then sends one-off and library images', async ({
  page,
}, testInfo) => {
  await openDefaultThread(page, testInfo)

  await page.getByTestId('chat-user-action-toggle').click()
  await chooseFile(page, 'chat-user-action-open-gif', {
    name: 'not-a-gif.png',
    mimeType: 'image/png',
    buffer: onePixelPng,
  })
  await expect(page.getByText(/请选择 GIF 文件|Please select a GIF file/)).toBeVisible()

  await chooseFile(page, 'chat-user-action-open-image', {
    name: 'too-large.png',
    mimeType: 'image/png',
    buffer: Buffer.alloc(2 * 1024 * 1024 + 1),
  })
  await page.getByRole('button', { name: /仅本次发送|One-off send/ }).click()
  await expect(page.getByText(/单次发送文件过大|One-off file is too large/)).toBeVisible()

  await chooseFile(page, 'chat-user-action-open-image', {
    name: 'one-off.png',
    mimeType: 'image/png',
    buffer: onePixelPng,
  })
  await page.getByRole('button', { name: /仅本次发送|One-off send/ }).click()
  const oneOffCard = page
    .locator('[data-block-type="image_virtual"]')
    .filter({ hasText: 'one-off.png' })
    .last()
  await expect(oneOffCard).toContainText(/一次性发送|One-off send/)
  const oneOffImage = oneOffCard.getByRole('img', { name: 'one-off.png' })
  await expect(oneOffImage).toBeVisible()
  await expect.poll(() => oneOffImage.evaluate((image) => image.naturalWidth)).toBeGreaterThan(0)

  await page.getByTestId('chat-user-action-toggle').click()
  await chooseFile(page, 'chat-user-action-open-image', {
    name: 'library-image.png',
    mimeType: 'image/png',
    buffer: onePixelPng,
  })
  await page.getByRole('button', { name: /导入后发送|Import first/ }).click()
  const libraryCard = page
    .locator('[data-block-type="image_virtual"]')
    .filter({ hasText: 'library-image.png' })
    .last()
  await expect(libraryCard).toContainText(/来自素材中心|From asset center/)
  const libraryImage = libraryCard.getByRole('img', { name: 'library-image.png' })
  await expect(libraryImage).toBeVisible()
  await expect.poll(() => libraryImage.evaluate((image) => image.naturalWidth)).toBeGreaterThan(0)
  await expectChatNoHorizontalOverflow(page)

  await page.reload()
  await waitForAppRouteReady(page, '/lock')
  await page.getByTestId('lock-unlock-button').click()
  await waitForAppRouteReady(page, '/home')
  await openHomeDockApp(page, 'app_chat', '/chat')
  await page.getByTestId('chat-contact-row-1').click()
  await waitForAppRouteReady(page, '/chat/1')
  await expect(
    page.locator('[data-block-type="image_virtual"]').filter({ hasText: 'one-off.png' }).last(),
  ).toBeVisible()
  await expect(
    page.locator('[data-block-type="image_virtual"]').filter({ hasText: 'library-image.png' }).last(),
  ).toBeVisible()
})
