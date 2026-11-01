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
const profileRole = 'Neighborhood illustrator'
const profileIdentity = 'A neighborhood illustrator who sketches at the corner cafe.'
const updatedIdentity = 'A botanical illustrator who prefers quiet morning walks.'
const hiddenSetting = 'PRIVATE_GENERAL_CARD_MARKER'
const cancelledIdentity = 'UNSAVED_GENERAL_CARD_MARKER'
const secondIdentity = 'A tea shop clerk who enjoys puzzles.'
const updatedAssistantReply = 'Let us take a quiet morning walk to sketch the plants.'
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
      if (window.localStorage.getItem('e2e:world-role-chat-seeded')) return
      window.localStorage.setItem(
        'schatphone:store:system',
        JSON.stringify({ version: 1, savedAt: Date.now(), data: system }),
      )
      window.localStorage.setItem(
        'schatphone:store:chat',
        JSON.stringify({ version: 2, savedAt: Date.now(), data: chat }),
      )
      window.localStorage.setItem('e2e:world-role-chat-seeded', '1')
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
  const chatPrompts = []

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
    else {
      chatRequestCount += 1
      chatPrompts.push(systemPrompt)
    }
    const personaReply = systemPrompt.includes(secondIdentity)
      ? 'We can try a puzzle over tea.'
      : systemPrompt.includes(updatedIdentity)
        ? updatedAssistantReply
        : systemPrompt.includes(profileIdentity) ? assistantReply : 'Missing persona context.'
    const content = isSmokeTest
      ? 'OK'
      : JSON.stringify({
          messages: [
            {
              replyType: 'plain',
              quote: null,
              blocks: [
                { type: 'text', variant: 'primary', lang: 'en', text: chatRequestCount === 1 ? personaReply : `${personaReply} (${chatRequestCount})` },
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
  await expect(page.getByLabel('Person ID', { exact: true })).toBeVisible()
  await expect(page.getByLabel('Name / Display Name', { exact: true })).toBeVisible()
  await page.getByTestId('contacts-profile-submit').click()
  await expect(page.getByTestId('contacts-profile-error')).toHaveText('Please enter a profile name.')
  await page.getByTestId('contacts-profile-role-id').fill('7301')
  await page.getByTestId('contacts-profile-name').fill(profileName)
  await page.getByTestId('contacts-profile-role').fill(profileRole)
  await page.getByTestId('contacts-profile-submit').click()

  await expect(page.getByTestId('contacts-role-detail')).toContainText(profileName)
  await page.getByTestId('contacts-persona-fill-from-overview').click()
  await page.getByTestId('contacts-profile-template-select').selectOption('preset_basic_modern')
  await page.getByTestId('contacts-profile-template-value-identity').fill(profileIdentity)
  await expect(page.getByTestId('contacts-general-chat-save-hint')).toContainText('public and familiar')
  await page.getByTestId('contacts-profile-template-value-relationship_setting').fill(hiddenSetting)
  await page.getByTestId('contacts-profile-template-visibility-relationship_setting').selectOption('hidden')
  await page.getByTestId('contacts-profile-template-value-life_habit').fill('Tea, Evening walks')
  await page.getByTestId('contacts-save-world-profile-fields').click()
  await page.getByTestId('contacts-detail-sheet-back').click()
  await expect(page.getByTestId('contacts-persona-readable-groups')).toContainText(profileIdentity)
  await expect(page.getByTestId('contacts-persona-chat-scope')).toContainText('are used in this person’s AI replies')
  await expect(page.getByTestId('contacts-start-chat')).toHaveCount(0)
  await expect(page.getByTestId('contacts-open-chat')).toHaveCount(0)
  await expectNoHorizontalOverflow(page)
  await expectNoCriticalAxeViolations(page)

  await page.getByTestId('contacts-go-to-chat').click()
  await expect(page.getByTestId('chat-directory-bind-modal')).toContainText(profileName)
  await expect(page.getByTestId('chat-directory-bind-profile')).toHaveValue('1')
  await page.screenshot({ path: testInfo.outputPath('add-and-chat-confirmation.png'), animations: 'disabled' })
  await expectNoCriticalAxeViolations(page)
  await page.getByRole('button', { name: 'Cancel', exact: true }).click()
  await expect(page.getByTestId('contacts-role-detail')).toContainText(profileName)
  await expect.poll(() => readPersistedJourneyCounts(page)).toMatchObject({ roleContacts: 0, conversations: 0 })
  await page.getByTestId('contacts-go-to-chat').click()
  await page.getByTestId('chat-directory-confirm-bind').click()
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
  expect(chatPrompts[0]).toContain(profileRole)
  expect(chatPrompts[0]).toContain(profileIdentity)
  expect(chatPrompts[0]).toContain('Evening walks')
  expect(chatPrompts[0]).not.toContain(hiddenSetting)
  await expectCredentialNotRendered(page, fakeCredential)
  await expectNoHorizontalOverflow(page)
  await expectNoCriticalAxeViolations(page)

  await page.getByTestId('chat-thread-menu-toggle').click()
  await page.getByTestId('thread-open-contact-info').click()
  await expect(page.getByTestId('contacts-role-detail')).toContainText(profileName)
  await expect(page.getByTestId('contacts-open-chat')).toHaveCount(0)
  await expect(page.getByTestId('contacts-start-chat')).toHaveCount(0)
  await page.screenshot({ path: testInfo.outputPath('person-profile-chat-entry.png'), animations: 'disabled' })
  await expect.poll(() => readPersistedJourneyCounts(page)).toMatchObject({
    roleProfiles: 1,
    roleContacts: 1,
    conversations: 1,
  })
  await expectNoHorizontalOverflow(page)
  await expectNoCriticalAxeViolations(page)
  expect(pageErrors).toEqual([])

  await page.getByTestId('contacts-go-to-chat').click()
  await waitForAppRouteReady(page, '/chat/1')
  await expect(page.getByText(assistantReply, { exact: false })).toBeVisible()
  await page.goBack()
  await expect(page.getByTestId('contacts-role-detail')).toContainText(profileName)
  await expect(page.getByTestId('contacts-persona-readable-groups')).toContainText(profileIdentity)
  // Reopen the app from storage rather than seeding the initial state again.
  await unlockToHome(page)
  await navigateInsideUnlockedApp(page, '/contacts?profileId=1')
  await expect(page.getByTestId('contacts-role-detail')).toContainText(profileName)
  await page.getByTestId('contacts-go-to-chat').click()
  await waitForAppRouteReady(page, '/chat/1')
  await expect(page.locator('.chat-message-row').filter({ hasText: draftText })).toBeVisible()
  await expect(page.getByText(assistantReply, { exact: false })).toBeVisible()
  await expect.poll(() => readPersistedJourneyCounts(page)).toMatchObject({ roleProfiles: 1, roleContacts: 1, conversations: 1 })
  await expect.poll(() => chatRequestCount).toBe(1)
  await page.screenshot({ path: testInfo.outputPath('chat-after-reopen.png'), animations: 'disabled' })

  const openProfileEditor = async () => {
    await page.getByTestId('chat-thread-menu-toggle').click()
    await page.getByTestId('thread-open-contact-info').click()
    await page.getByTestId('contacts-persona-fill-from-overview').click()
  }
  const replyAgain = async (expectedCount, expectedReply) => {
    await page.getByTestId('chat-message-input').fill(`How would you spend today? ${expectedCount}`)
    await page.getByTestId('chat-message-input').press('Enter')
    await page.getByTestId('chat-trigger-reply').click()
    await expect(page.getByText(`${expectedReply} (${expectedCount})`, { exact: false })).toBeVisible()
    await expect.poll(() => chatRequestCount).toBe(expectedCount)
  }

  // Cancelled draft must never enter a later generation request.
  await openProfileEditor()
  await page.getByTestId('contacts-profile-template-value-identity').fill(cancelledIdentity)
  await page.getByTestId('contacts-cancel-world-profile-fields').click()
  await page.getByTestId('contacts-detail-sheet-back').click()
  await page.getByTestId('contacts-go-to-chat').click()
  await replyAgain(2, assistantReply)
  expect(chatPrompts[1]).toContain(profileIdentity)
  expect(chatPrompts[1]).not.toContain(cancelledIdentity)

  // A saved edit changes the next request, without a new binding or thread.
  await openProfileEditor()
  await page.getByTestId('contacts-profile-template-value-identity').fill(updatedIdentity)
  await page.getByTestId('contacts-save-world-profile-fields').click()
  await page.getByTestId('contacts-detail-sheet-back').click()
  await page.getByTestId('contacts-go-to-chat').click()
  await replyAgain(3, updatedAssistantReply)
  expect(chatPrompts[2]).toContain(updatedIdentity)
  expect(chatPrompts[2]).not.toContain(profileIdentity)

  await unlockToHome(page)
  await navigateInsideUnlockedApp(page, '/contacts?profileId=1')
  await expect(page.getByTestId('contacts-persona-readable-groups')).toContainText(updatedIdentity)
  await page.getByTestId('contacts-go-to-chat').click()
  await replyAgain(4, updatedAssistantReply)
  expect(chatPrompts[3]).toContain(updatedIdentity)
  await page.screenshot({ path: testInfo.outputPath('general-persona-reply-after-reopen.png'), animations: 'disabled' })

  // A second role must receive only its own general persona.
  await navigateInsideUnlockedApp(page, '/contacts')
  await page.getByTestId('contacts-add-profile').click()
  await page.getByTestId('contacts-profile-role-id').fill('7302')
  await page.getByTestId('contacts-profile-name').fill('Second general-card person')
  await page.getByTestId('contacts-profile-submit').click()
  await page.getByTestId('contacts-persona-fill-from-overview').click()
  await page.getByTestId('contacts-profile-template-select').selectOption('preset_basic_modern')
  await page.getByTestId('contacts-profile-template-value-identity').fill(secondIdentity)
  await page.getByTestId('contacts-save-world-profile-fields').click()
  await page.getByTestId('contacts-detail-sheet-back').click()
  await page.getByTestId('contacts-go-to-chat').click()
  await page.getByTestId('chat-directory-confirm-bind').click()
  await replyAgain(5, 'We can try a puzzle over tea.')
  expect(chatPrompts[4]).toContain(secondIdentity)
  expect(chatPrompts[4]).not.toContain(updatedIdentity)
  expect(chatPrompts.every((prompt) => !prompt.includes(hiddenSetting) && !prompt.includes(cancelledIdentity))).toBe(true)
  await expect.poll(() => readPersistedJourneyCounts(page)).toMatchObject({ roleProfiles: 2, roleContacts: 2, conversations: 2 })
  expect(pageErrors).toEqual([])
})
