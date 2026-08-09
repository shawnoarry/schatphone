import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import {
  openHomeDockApp,
  waitForAppRouteReady,
  unlockToHome,
} from './helpers/navigation.js'

test.use({
  trace: 'off',
  screenshot: 'off',
  video: 'off',
})

const providerUrl = 'https://activation.provider.test/v1/chat/completions'
const providerModel = 'activation-model'
const draftText = 'Keep this first-use draft in the same conversation.'
const draftSecondLine = 'Continue this as a second line.'
const assistantReply = 'Your first SchatPhone reply is ready.'
const recoveryDraft = 'Cancel this reply once, then retry it.'
const recoveredReply = 'The canceled reply recovered successfully.'

const expectNoHorizontalOverflow = async (page) => {
  const overflow = await page.evaluate(() => {
    const chatInput = document.querySelector('.chat-input')
    const networkScroll = document.querySelector('.network-scroll')
    const measure = (element) =>
      element instanceof HTMLElement ? element.scrollWidth - element.clientWidth : 0

    return {
      document: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      body: document.body.scrollWidth - document.body.clientWidth,
      chatInput: measure(chatInput),
      networkScroll: measure(networkScroll),
    }
  })

  expect(overflow.document, 'document should not overflow horizontally').toBeLessThanOrEqual(1)
  expect(overflow.body, 'body should not overflow horizontally').toBeLessThanOrEqual(1)
  expect(overflow.chatInput, 'Chat composer should not overflow horizontally').toBeLessThanOrEqual(
    1,
  )
  expect(
    overflow.networkScroll,
    'Network content should not overflow horizontally',
  ).toBeLessThanOrEqual(1)
}

const expectNoCriticalAxeViolations = async (page) => {
  const accessibility = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze()
  const criticalViolations = accessibility.violations.filter(
    (violation) => violation.impact === 'critical',
  )

  expect(criticalViolations).toEqual([])
}

const expectCredentialNotRendered = async (page, credential) => {
  const rendered = await page.locator('body').evaluate(
    (body, value) => body.innerText.includes(value),
    credential,
  )

  expect(rendered, 'the fake credential must not appear in visible copy').toBe(false)
}

test('fresh storage reaches the first successful Chat reply through Network setup', async ({
  page,
}, testInfo) => {
  const fakeCredential = `activation_fake_${testInfo.project.name.replace(/[^a-z0-9]+/gi, '_')}`
  const pageErrors = []
  let modelRequestCount = 0
  let smokeRequestCount = 0
  let chatRequestCount = 0
  let holdNextChatRequest = false
  let releaseHeldRequest = null

  page.on('pageerror', (error) => pageErrors.push(error.message))
  await page.emulateMedia({ reducedMotion: 'reduce' })

  const projectBaseUrl = new URL(String(testInfo.project.use.baseURL))
  if (
    testInfo.project.name === 'mobile-chrome' &&
    ['127.0.0.1', 'localhost'].includes(projectBaseUrl.hostname)
  ) {
    projectBaseUrl.hostname = projectBaseUrl.hostname === '127.0.0.1' ? 'localhost' : '127.0.0.1'
  }
  projectBaseUrl.hash = '/lock'

  await page.route('https://activation.provider.test/**', async (route) => {
    const request = route.request()
    if (request.method() === 'GET') {
      modelRequestCount += 1
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'access-control-allow-origin': '*' },
        body: JSON.stringify({ data: [{ id: providerModel }] }),
      })
      return
    }

    const payload = request.postDataJSON()
    const systemPrompt = String(payload?.messages?.[0]?.content || '')
    const isSmokeTest = systemPrompt.includes('connection smoke-test endpoint')
    if (isSmokeTest) smokeRequestCount += 1
    else {
      chatRequestCount += 1
      if (holdNextChatRequest) {
        holdNextChatRequest = false
        await new Promise((resolve) => {
          releaseHeldRequest = resolve
        })
      }
    }

    const latestUserMessage = [...(payload?.messages || [])]
      .reverse()
      .find((message) => message?.role === 'user')
    const latestUserText = String(latestUserMessage?.content || '')
    const currentAssistantReply = latestUserText.includes(recoveryDraft)
      ? recoveredReply
      : assistantReply

    const content = isSmokeTest
      ? 'OK'
      : JSON.stringify({
          messages: [
            {
              replyType: 'plain',
              quote: null,
              blocks: [
                {
                  type: 'text',
                  variant: 'primary',
                  lang: 'en',
                  text: currentAssistantReply,
                },
              ],
            },
          ],
        })

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: { 'access-control-allow-origin': '*' },
      body: JSON.stringify({ choices: [{ message: { content } }] }),
    })
  })

  await unlockToHome(page, projectBaseUrl.href)
  await openHomeDockApp(page, 'app_chat', '/chat')
  await page.getByTestId('chat-contact-row-1').click()
  await waitForAppRouteReady(page, '/chat/1')
  await expect(page).toHaveURL(/#\/chat\/1\?from=home&homePage=0$/)

  const readiness = page.getByTestId('chat-network-readiness')
  await expect(readiness).toBeVisible()
  await expect(readiness).toContainText(/AI 尚未连接|AI is not connected/)
  const setupAction = page.getByTestId('chat-open-network-setup')
  await expect(setupAction).toBeVisible()
  await expect(setupAction).toHaveText(/前往设置|Open settings/)

  await page.getByTestId('chat-message-input').fill(draftText)
  await expectNoHorizontalOverflow(page)
  await expectNoCriticalAxeViolations(page)
  await setupAction.click()

  await waitForAppRouteReady(page, '/network')
  await expect(page).toHaveURL(/#\/network\?source=chat&chatId=1&homePage=0$/)
  await expect(page.locator('.network-nav-button').first()).toHaveText(/聊天|Chat/)
  await expect(page.getByTestId('network-continue-chat')).toHaveCount(0)

  await page.getByTestId('network-api-url-input').fill(providerUrl)
  await page.getByTestId('network-api-key-input').fill(fakeCredential)
  await page.getByTestId('network-manual-model-input').fill(providerModel)
  await expect.poll(() => modelRequestCount).toBeGreaterThan(0)
  await expect(page.getByTestId('network-manual-model-input')).toHaveValue(providerModel)

  await page.getByTestId('network-save-settings').click()
  await expect(page.getByTestId('network-continue-chat')).toHaveCount(0)
  await page.getByTestId('network-chat-smoke-run').click()

  await expect(page.getByTestId('network-chat-smoke-success')).toContainText('OK')
  await expect(page.getByTestId('network-continue-chat')).toBeVisible()
  await expect.poll(() => smokeRequestCount).toBe(1)
  await expectCredentialNotRendered(page, fakeCredential)
  await expectNoHorizontalOverflow(page)
  await expectNoCriticalAxeViolations(page)

  await page.getByTestId('network-continue-chat').click()
  await waitForAppRouteReady(page, '/chat/1')
  await expect(page).toHaveURL(/#\/chat\/1\?from=home&homePage=0$/)
  const chatInput = page.getByTestId('chat-message-input')
  await expect(chatInput).toHaveValue(draftText)
  await expect(chatInput).toHaveJSProperty('tagName', 'TEXTAREA')
  await expect(page.getByTestId('chat-network-readiness')).toHaveCount(0)

  const oneLineInputHeight = await chatInput.evaluate((input) => input.getBoundingClientRect().height)
  await chatInput.press('Shift+Enter')
  await chatInput.type(draftSecondLine)
  await expect(chatInput).toHaveValue(`${draftText}\n${draftSecondLine}`)
  const multilineInputHeight = await chatInput.evaluate((input) => input.getBoundingClientRect().height)
  expect(multilineInputHeight).toBeGreaterThan(oneLineInputHeight)

  await chatInput.press('Enter')
  await expect(page.locator('.chat-message-row').filter({ hasText: draftSecondLine })).toBeVisible()
  await page.getByTestId('chat-trigger-reply').click()
  await expect(page.getByText(assistantReply, { exact: false })).toBeVisible()
  await expect.poll(() => chatRequestCount).toBe(1)
  await expectCredentialNotRendered(page, fakeCredential)
  await expectNoHorizontalOverflow(page)
  await expectNoCriticalAxeViolations(page)

  await chatInput.fill(recoveryDraft)
  await chatInput.press('Enter')
  holdNextChatRequest = true
  await page.getByTestId('chat-trigger-reply').click()
  await expect.poll(() => Boolean(releaseHeldRequest)).toBe(true)

  const stopReply = page.getByTestId('chat-cancel-reply')
  await expect(stopReply).toBeVisible()
  await expect(stopReply).toHaveAccessibleName(/停止回复|Stop reply/)
  await stopReply.click()
  releaseHeldRequest()
  releaseHeldRequest = null

  await expect(page.getByText(/请求已取消|Request canceled/)).toBeVisible()
  const retryReply = page.getByRole('button', { name: /重试|Retry/ })
  await expect(retryReply).toBeVisible()
  await retryReply.click()
  await expect(page.getByText(recoveredReply, { exact: false })).toBeVisible()
  await expect.poll(() => chatRequestCount).toBe(3)
  await expect(page.getByTestId('chat-cancel-reply')).toHaveCount(0)
  await expectNoHorizontalOverflow(page)
  await expectNoCriticalAxeViolations(page)
  expect(pageErrors).toEqual([])
})
