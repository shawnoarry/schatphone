import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import {
  navigateInsideUnlockedApp,
  unlockToHome,
  waitForAppRouteReady,
} from './helpers/navigation.js'

test.use({
  trace: 'off',
  screenshot: 'off',
  video: 'off',
})

const providerUrl = 'https://world-role-chat.provider.test/v1/chat/completions'
const providerModel = 'world-role-chat-model'
const profileName = 'Avery Without Optional World Sources'
const draftText = 'Meet me after the late library shift.'
const assistantReply = 'I will be there when the library closes.'

const systemSnapshot = {
  settings: {
    api: {
      url: '',
      key: '',
      model: '',
      presets: [],
      activePresetId: '',
    },
    system: {
      language: 'en-US',
    },
  },
  user: {
    name: 'Journey Test User',
    avatar: '',
    knowledgePoints: [],
    encyclopediaEntries: [],
    worldBookSourceLinks: [],
    enabledWorldPackIds: [],
    worldPackEnablements: {},
  },
}

const emptyCustomRoleSnapshot = {
  moduleAvatarOverrides: {
    selfAvatar: '',
    defaultContactAvatar: '',
    contactAvatars: {},
  },
  moduleIdentity: {
    avatar: '',
    nickname: '',
    anonymityEnabled: false,
    anonymityScope: 'all',
    anonymityContactIds: [],
  },
  roleProfiles: [],
  contacts: [],
  conversations: {},
  messagesByConversation: {},
}

const seedExplicitEmptyCustomRoleState = async (page) => {
  await page.addInitScript(
    ({ system, chat }) => {
      window.localStorage.setItem(
        'schatphone:store:system',
        JSON.stringify({ version: 1, savedAt: Date.now(), data: system }),
      )
      window.localStorage.setItem(
        'schatphone:store:chat',
        JSON.stringify({ version: 2, savedAt: Date.now(), data: chat }),
      )
    },
    { system: systemSnapshot, chat: emptyCustomRoleSnapshot },
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

const readPersistedJourneyCounts = (page) =>
  page.evaluate(() => {
    const readData = (key) => {
      const parsed = JSON.parse(window.localStorage.getItem(key) || '{}')
      return parsed?.data && typeof parsed.data === 'object' ? parsed.data : {}
    }
    const chat = readData('schatphone:store:chat')
    const system = readData('schatphone:store:system')
    return {
      roleProfiles: Array.isArray(chat.roleProfiles) ? chat.roleProfiles.length : -1,
      roleContacts: Array.isArray(chat.contacts)
        ? chat.contacts.filter((contact) => contact.kind === 'role').length
        : -1,
      conversations:
        chat.conversations && typeof chat.conversations === 'object'
          ? Object.keys(chat.conversations).length
          : -1,
      selectedBookSources: Array.isArray(system.user?.worldBookSourceLinks)
        ? system.user.worldBookSourceLinks.length
        : -1,
      encyclopediaEntries: Array.isArray(system.user?.encyclopediaEntries)
        ? system.user.encyclopediaEntries.length
        : -1,
      enabledWorldPacks: Array.isArray(system.user?.enabledWorldPackIds)
        ? system.user.enabledWorldPackIds.length
        : -1,
    }
  })

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await seedExplicitEmptyCustomRoleState(page)
})

test('an explicitly empty custom-role state reaches Chat directly from Contacts', async ({
  page,
}, testInfo) => {
  const fakeCredential = `world_role_chat_fake_${testInfo.project.name.replace(/[^a-z0-9]+/gi, '_')}`
  const pageErrors = []
  let smokeRequestCount = 0
  let chatRequestCount = 0

  page.on('pageerror', (error) => pageErrors.push(error.message))
  await page.route('https://world-role-chat.provider.test/**', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'access-control-allow-origin': '*' },
        body: JSON.stringify({ data: [{ id: providerModel }] }),
      })
      return
    }

    const payload = route.request().postDataJSON()
    const systemPrompt = String(payload?.messages?.[0]?.content || '')
    const isSmokeTest = systemPrompt.includes('connection smoke-test endpoint')
    if (isSmokeTest) smokeRequestCount += 1
    else chatRequestCount += 1
    const content = isSmokeTest
      ? 'OK'
      : JSON.stringify({
          messages: [
            {
              replyType: 'plain',
              quote: null,
              blocks: [
                { type: 'text', variant: 'primary', lang: 'en', text: assistantReply },
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

  await unlockToHome(page)
  await expect.poll(() => readPersistedJourneyCounts(page)).toEqual({
    roleProfiles: 0,
    roleContacts: 0,
    conversations: 0,
    selectedBookSources: 0,
    encyclopediaEntries: 0,
    enabledWorldPacks: 0,
  })

  await navigateInsideUnlockedApp(page, '/contacts')
  await page.getByTestId('contacts-add-profile').click()
  await page.getByTestId('contacts-profile-role-id').fill('7301')
  await page.getByTestId('contacts-profile-name').fill(profileName)
  await page.getByTestId('contacts-profile-submit').click()

  await expect(page.getByTestId('contacts-role-detail')).toContainText(profileName)
  await expect(page.getByTestId('contacts-start-chat')).toHaveCount(0)
  await expect(page.getByTestId('contacts-open-chat')).toHaveCount(0)
  await expectNoHorizontalOverflow(page)
  await expectNoCriticalAxeViolations(page)

  await navigateInsideUnlockedApp(page, '/chat-contacts')
  await page.getByTestId('chat-directory-add-contact').click()
  await expect(page.getByTestId('chat-directory-bind-modal')).toContainText(profileName)
  await page.getByTestId('chat-directory-confirm-bind').click()
  await page.locator('.chat-contact-row__identity').filter({ hasText: profileName }).click()
  await waitForAppRouteReady(page, '/chat/1')
  await expect(page).toHaveURL(/#\/chat\/1$/)
  await expect.poll(() => readPersistedJourneyCounts(page)).toMatchObject({
    roleProfiles: 1,
    roleContacts: 1,
    conversations: 1,
    selectedBookSources: 0,
    encyclopediaEntries: 0,
    enabledWorldPacks: 0,
  })

  await page.getByTestId('chat-message-input').fill(draftText)
  await expect(page.getByTestId('chat-network-readiness')).toBeVisible()
  await page.getByTestId('chat-open-network-setup').click()
  await waitForAppRouteReady(page, '/network')
  await expect(page).toHaveURL(/#\/network\?source=chat&chatId=1$/)

  await page.getByTestId('network-api-url-input').fill(providerUrl)
  await page.getByTestId('network-api-key-input').fill(fakeCredential)
  await page.getByTestId('network-manual-model-input').fill(providerModel)
  await page.getByTestId('network-save-settings').click()
  await page.getByTestId('network-chat-smoke-run').click()

  await expect(page.getByTestId('network-chat-smoke-success')).toContainText('OK')
  await expect(page.getByTestId('network-continue-chat')).toBeVisible()
  await expect.poll(() => smokeRequestCount).toBe(1)
  await expectCredentialNotRendered(page, fakeCredential)
  await expectNoHorizontalOverflow(page)
  await expectNoCriticalAxeViolations(page)

  await page.getByTestId('network-continue-chat').click()
  await waitForAppRouteReady(page, '/chat/1')
  await expect(page).toHaveURL(/#\/chat\/1$/)
  await expect(page.getByTestId('chat-message-input')).toHaveValue(draftText)

  await page.getByTestId('chat-message-input').press('Enter')
  await expect(page.locator('.chat-message-row').filter({ hasText: draftText })).toBeVisible()
  await page.getByTestId('chat-trigger-reply').click()
  await expect(page.getByText(assistantReply, { exact: false })).toBeVisible()
  await expect.poll(() => chatRequestCount).toBe(1)
  await expectCredentialNotRendered(page, fakeCredential)
  await expectNoHorizontalOverflow(page)
  await expectNoCriticalAxeViolations(page)

  await page.getByTestId('chat-thread-back').click()
  await waitForAppRouteReady(page, '/chat')
  await navigateInsideUnlockedApp(page, '/contacts?profileId=1')
  await expect(page.getByTestId('contacts-role-detail')).toContainText(profileName)
  await expect(page.getByTestId('contacts-open-chat')).toHaveCount(0)
  await expect(page.getByTestId('contacts-start-chat')).toHaveCount(0)
  await expect.poll(() => readPersistedJourneyCounts(page)).toMatchObject({
    roleProfiles: 1,
    roleContacts: 1,
    conversations: 1,
  })
  await expectNoHorizontalOverflow(page)
  await expectNoCriticalAxeViolations(page)
  expect(pageErrors).toEqual([])
})
