import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { navigateInsideUnlockedApp, unlockToHome } from './helpers/navigation.js'

test.use({
  trace: 'off',
  screenshot: 'off',
  video: 'off',
})

const providerUrl = 'https://compatibility.provider.test/v1/chat/completions'
const providerModel = 'compatibility-model'
const relayBaseUrl = 'https://schatphone.noarry.workers.dev/api/openai/v1'

const expectNoHorizontalOverflow = async (page) => {
  const overflow = await page.evaluate(() => {
    const networkScroll = document.querySelector('.network-scroll')
    const measure = (element) =>
      element instanceof HTMLElement ? element.scrollWidth - element.clientWidth : 0

    return {
      document: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      body: document.body.scrollWidth - document.body.clientWidth,
      networkScroll: measure(networkScroll),
    }
  })

  expect(overflow.document, 'document should not overflow horizontally').toBeLessThanOrEqual(1)
  expect(overflow.body, 'body should not overflow horizontally').toBeLessThanOrEqual(1)
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

test('Network defaults to direct and explicitly relays OpenAI-compatible requests', async ({
  page,
}, testInfo) => {
  const fakeCredential = `proxy_fake_${testInfo.project.name.replace(/[^a-z0-9]+/gi, '_')}`
  const relayRequests = []
  let directRequestCount = 0
  const pageErrors = []

  page.on('pageerror', (error) => pageErrors.push(error.message))
  await page.emulateMedia({ reducedMotion: 'reduce' })

  await page.route('https://compatibility.provider.test/**', async (route) => {
    directRequestCount += 1
    await route.abort('blockedbyclient')
  })

  await page.route(`${relayBaseUrl}/**`, async (route) => {
    const request = route.request()
    const origin = request.headers().origin || '*'

    if (request.method() === 'OPTIONS') {
      await route.fulfill({
        status: 204,
        headers: {
          'access-control-allow-origin': origin,
          'access-control-allow-methods': 'GET, POST, OPTIONS',
          'access-control-allow-headers':
            'Authorization, Content-Type, X-SchatPhone-Upstream-URL',
        },
      })
      return
    }

    relayRequests.push({
      method: request.method(),
      url: request.url(),
      headers: request.headers(),
      body: request.postData() || '',
    })

    const body = request.method() === 'GET'
      ? { data: [{ id: providerModel }] }
      : { choices: [{ message: { content: 'OK' } }] }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: { 'access-control-allow-origin': origin },
      body: JSON.stringify(body),
    })
  })

  await unlockToHome(page)
  await navigateInsideUnlockedApp(page, '/network')

  const directMode = page.getByTestId('network-transport-direct')
  const proxyMode = page.getByTestId('network-transport-proxy')

  await expect(directMode).toHaveAttribute('aria-pressed', 'true')
  await expect(proxyMode).toHaveAttribute('aria-pressed', 'false')
  await expect(page.getByTestId('network-proxy-notice')).toHaveCount(0)

  await proxyMode.click()
  await expect(proxyMode).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByTestId('network-proxy-notice')).toBeVisible()

  await page.getByTestId('network-api-url-input').fill(providerUrl)
  await page.getByTestId('network-api-key-input').fill(fakeCredential)
  await page.getByTestId('network-manual-model-input').fill(providerModel)

  await expect.poll(() => relayRequests.some((request) => request.method === 'GET')).toBe(true)
  await page.getByTestId('network-chat-smoke-run').click()
  await expect(page.getByTestId('network-chat-smoke-success')).toContainText('OK')
  await expect.poll(() => relayRequests.some((request) => request.method === 'POST')).toBe(true)

  const modelRequest = relayRequests.find((request) => request.method === 'GET')
  const chatRequest = relayRequests.find((request) => request.method === 'POST')
  for (const request of [modelRequest, chatRequest]) {
    expect(request.url).toMatch(new RegExp(`^${relayBaseUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/`))
    expect(request.headers['x-schatphone-upstream-url']).toBe(providerUrl)
    expect(request.headers.authorization).toBe(`Bearer ${fakeCredential}`)
    expect(request.body).not.toContain(fakeCredential)
  }

  await expect(page.getByTestId('network-api-key-input')).toHaveAttribute('type', 'password')
  const credentialIsVisible = await page.locator('body').evaluate(
    (body, credential) => body.innerText.includes(credential),
    fakeCredential,
  )
  expect(credentialIsVisible, 'provider key must not appear in visible page copy').toBe(false)
  expect(directRequestCount).toBe(0)

  await expectNoHorizontalOverflow(page)
  await expectNoCriticalAxeViolations(page)
  await testInfo.attach(`network-proxy-${testInfo.project.name}.png`, {
    body: await page.screenshot({ animations: 'disabled' }),
    contentType: 'image/png',
  })

  expect(pageErrors).toEqual([])
})
