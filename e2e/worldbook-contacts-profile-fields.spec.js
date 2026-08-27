import { expect, test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { navigateInsideUnlockedApp, unlockToHome } from './helpers/navigation.js'

const systemSnapshot = {
  settings: {
    system: {
      language: 'en-US',
    },
  },
  user: {
    name: 'Test User',
    avatar: '',
    knowledgePoints: [],
    profileTemplates: [],
  },
}

const chatSnapshot = {
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

const personaProviderUrl = 'https://persona-classification.provider.test/v1/chat/completions'
const personaProviderModel = 'persona-classification-model'
const personaProfileId = 91
const personaSourceText =
  'Agency: Galaxy Entertainment\nOccupation: Actor\nStage name: Livia\nAvoids using a full name in private.'

const personaSystemSnapshot = {
  ...systemSnapshot,
  settings: {
    ...systemSnapshot.settings,
    api: {
      url: personaProviderUrl,
      key: 'persona-classification-e2e-key',
      model: personaProviderModel,
      resolvedKind: 'openai_compatible',
      transportMode: 'direct',
      proxyUrl: '',
      proxyToken: '',
      presets: [],
      activePresetId: '',
    },
  },
  user: {
    ...systemSnapshot.user,
    profileTemplates: [
      {
        id: 'world_template_persona_e2e',
        title: 'Persona E2E profile',
        scope: 'world',
        worldId: 'default_world',
        version: 4,
        categories: [{ id: 'identity', label: 'Identity', order: 0 }],
        fields: [
          {
            id: 'occupation',
            categoryId: 'identity',
            label: 'Occupation',
            type: 'short_text',
            order: 0,
          },
          {
            id: 'agency',
            categoryId: 'identity',
            label: 'Agency',
            type: 'organization_reference',
            order: 1,
          },
        ],
      },
    ],
  },
}

const personaChatSnapshot = {
  ...chatSnapshot,
  roleProfiles: [
    {
      id: personaProfileId,
      roleId: '9091',
      name: 'Persona E2E role',
      role: 'Singer',
      entityType: 'main_role',
      isMain: true,
      revision: 7,
      bio: 'A profile used to prove review-only persona classification.',
      templateLink: {
        primaryWorldId: 'default_world',
        profileTemplateId: 'world_template_persona_e2e',
        profileTemplateVersion: 4,
      },
      profileValues: [{ fieldId: 'occupation', value: 'Singer', visibilityLevel: 'familiar' }],
    },
  ],
}

const seedEmptyWorldAndContacts = async (page) => {
  await page.addInitScript(
    ({ system, chat }) => {
      window.localStorage.setItem(
        'schatphone:store:system',
        JSON.stringify({
          version: 1,
          savedAt: Date.now(),
          data: system,
        }),
      )
      window.localStorage.setItem(
        'schatphone:store:chat',
        JSON.stringify({
          version: 2,
          savedAt: Date.now(),
          data: chat,
        }),
      )
    },
    { system: systemSnapshot, chat: chatSnapshot },
  )
}

const expectNoHorizontalOverflow = async (page) => {
  const hasOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  )
  expect(hasOverflow).toBe(false)
}

const seedPersonaClassificationFixture = async (page, { language = 'en-US', night = false } = {}) => {
  const system = structuredClone(personaSystemSnapshot)
  system.settings.system.language = language
  system.settings.appearance = {
    ...(system.settings.appearance || {}),
    colorMode: night ? 'night' : 'day',
    currentTheme: night ? 'zen' : 'default',
  }
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
    { system, chat: personaChatSnapshot },
  )
}

const readPersistedPersonaProfile = (page) =>
  page.evaluate((profileId) => {
    const persisted = JSON.parse(window.localStorage.getItem('schatphone:store:chat') || '{}')
    const profiles = Array.isArray(persisted?.data?.roleProfiles) ? persisted.data.roleProfiles : []
    const profile = profiles.find((item) => Number(item?.id) === Number(profileId))
    if (!profile) return ''
    return JSON.stringify({
      profileValues: profile.profileValues,
      templateLink: profile.templateLink,
      revision: profile.revision,
    })
  }, personaProfileId)

test.beforeEach(async ({ page }, testInfo) => {
  await page.setViewportSize(
    testInfo.project.name === 'mobile-chrome'
      ? { width: 390, height: 844 }
      : { width: 1280, height: 900 },
  )
  await seedEmptyWorldAndContacts(page)
})

test('WorldBook profile template can be filled as concrete Contacts values', async ({ page }) => {
  const pageErrors = []
  page.on('pageerror', (error) => {
    pageErrors.push(error.message)
  })

  await unlockToHome(page)

  await navigateInsideUnlockedApp(page, '/worldbook')
  await page.getByTestId('worldbook-panel-tab-templates').click()
  await expect(page.getByTestId('worldbook-profile-templates')).toBeVisible()
  await expect(page.getByTestId('worldbook-profile-templates')).toContainText('Current-world enabled templates')

  await page.getByTestId('worldbook-template-copy-preset_abo').click()
  await expect(page.getByTestId('worldbook-profile-templates')).toContainText('ABO Profile')
  await expectNoHorizontalOverflow(page)

  await page.getByTestId('worldbook-open-contacts-for-templates').click()
  await expect(page).toHaveURL(/#\/contacts\?/)
  await expect(page.getByTestId('contacts-worldbook-template-handoff')).toContainText(
    'Select or create a profile',
  )
  await expectNoHorizontalOverflow(page)

  await page.getByTestId('contacts-worldbook-template-create-profile').click()
  const modal = page.getByTestId('contacts-profile-modal')
  await expect(modal).toBeVisible()
  await page.getByTestId('contacts-profile-role-id').fill('8801')
  await modal.locator('input').nth(1).fill('Template E2E Role')
  await modal.locator('.contacts-modal-header button').nth(1).click()

  await expect(modal).toHaveCount(0)
  await expect(page.getByTestId('contacts-role-detail')).toContainText('Template E2E Role')
  await page.getByTestId('contacts-open-world-fields-sheet').click()

  await expect(page.getByTestId('contacts-world-profile-fields-editor')).toHaveCount(0)
  await expect(page.getByTestId('contacts-world-profile-fields-section')).toContainText(
    'No profile card has been selected or filled yet.',
  )
  await page.getByTestId('contacts-edit-world-profile-fields').click()
  await expect(page.getByTestId('contacts-world-profile-fields-editor')).toBeVisible()
  await expect(page.getByTestId('contacts-profile-template-select')).toContainText('ABO Profile')
  await expect(page.getByTestId('contacts-template-change-review')).toContainText('Save review')
  await page.getByTestId('contacts-profile-template-value-secondary_gender').selectOption('Omega')
  await page.getByTestId('contacts-profile-template-value-pheromone').fill('Cedar rain')
  await page.getByTestId('contacts-profile-template-visibility-pheromone').selectOption('intimate')
  await expectNoHorizontalOverflow(page)

  await page.getByTestId('contacts-save-world-profile-fields').click()
  await expect(page.getByTestId('contacts-world-profile-fields-editor')).toHaveCount(0)
  await expect(page.getByTestId('contacts-world-field-category-general')).toContainText('General')
  await expect(page.getByTestId('contacts-world-field-secondary_gender')).toContainText('Omega')
  await expect(page.getByTestId('contacts-world-field-pheromone')).toContainText('Cedar rain')
  await expect(page.getByTestId('contacts-world-field-pheromone')).toContainText('Intimate')
  await expect(page.getByTestId('contacts-world-field-category-prompt-general')).toContainText(
    'Consider adding Bond mark.',
  )
  await expect(page.getByTestId('contacts-world-profile-fields-section')).not.toContainText(/\d+\/\d+/)
  await expectNoHorizontalOverflow(page)

  await page.getByTestId('contacts-edit-world-profile-fields').click()
  await expect(page.getByTestId('contacts-profile-template-value-pheromone')).toHaveValue('Cedar rain')
  await page.getByTestId('contacts-profile-template-value-pheromone').fill('Unsaved value')
  await page.getByTestId('contacts-cancel-world-profile-fields').click()
  await expect(page.getByTestId('contacts-world-profile-fields-editor')).toHaveCount(0)
  await expect(page.getByTestId('contacts-world-field-pheromone')).toContainText('Cedar rain')
  await expect(page.getByTestId('contacts-world-profile-fields-section')).not.toContainText('Unsaved value')

  await page.getByTestId('contacts-edit-world-profile-fields').click()
  await page.getByTestId('contacts-add-person-profile-field').click()
  await page
    .getByTestId('contacts-profile-extension-category')
    .selectOption('__new_profile_category__')
  await page.getByTestId('contacts-profile-extension-new-category-label').fill('Private habits')
  await page.getByTestId('contacts-profile-extension-label').fill('Nickname rule')
  await page
    .getByTestId('contacts-profile-extension-value')
    .fill('Do not use the full name in private.')
  await expectNoHorizontalOverflow(page)
  await page.getByTestId('contacts-save-profile-extension').click()
  await expect(page.getByTestId('contacts-world-profile-fields-editor')).toContainText('Nickname rule')
  await page.getByTestId('contacts-save-world-profile-fields').click()
  await expect(page.getByTestId('contacts-world-profile-fields-editor')).toHaveCount(0)
  await expect(page.getByTestId('contacts-world-profile-fields-section')).toContainText('Private habits')
  await expect(page.getByTestId('contacts-world-profile-fields-section')).toContainText('Person only')
  await expect(page.getByTestId('contacts-world-profile-fields-section')).toContainText(
    'Do not use the full name in private.',
  )

  await page.getByTestId('contacts-edit-world-profile-fields').click()
  await page.getByTestId('contacts-add-person-profile-field').click()
  await page.getByTestId('contacts-profile-extension-label').fill('Stage call sign')
  await page.getByTestId('contacts-profile-extension-value').fill('Blue Hour')
  await page.getByTestId('contacts-profile-extension-scope-world').check()
  await page.getByTestId('contacts-save-profile-extension').click()
  await page.getByTestId('contacts-save-world-profile-fields').click()
  await expect(page.getByTestId('contacts-world-profile-fields-section')).toContainText('Stage call sign')
  await expect(page.getByTestId('contacts-world-profile-fields-section')).toContainText('Blue Hour')
  await expectNoHorizontalOverflow(page)

  expect(pageErrors).toEqual([])
})

test('WorldBook can manually build and revise a profile card without AI', async ({ page }) => {
  const pageErrors = []
  page.on('pageerror', (error) => {
    pageErrors.push(error.message)
  })

  await unlockToHome(page)
  await navigateInsideUnlockedApp(page, '/worldbook')
  await page.getByTestId('worldbook-panel-tab-templates').click()
  await page.getByTestId('worldbook-profile-template-create').click()

  const editor = page.getByTestId('worldbook-profile-template-editor')
  await expect(editor).toBeVisible()
  await page.getByTestId('worldbook-profile-template-title').fill('Manual entertainment profile')
  await page.locator('[data-testid^="worldbook-profile-add-field-"]').first().click()

  const fieldCard = page.locator('[data-testid^="worldbook-profile-field-card-"]').first()
  const fieldTestId = await fieldCard.getAttribute('data-testid')
  const fieldId = fieldTestId.replace('worldbook-profile-field-card-', '')
  await page.getByTestId(`worldbook-profile-field-label-${fieldId}`).fill('Agency')
  await page.getByTestId(`worldbook-profile-field-type-${fieldId}`).selectOption(
    'organization_reference',
  )
  await expectNoHorizontalOverflow(page)

  await page.getByTestId('worldbook-profile-template-save').click()
  await expect(editor).toHaveCount(0)
  const templateRow = page.locator('.worldbook-template-row').filter({
    hasText: 'Manual entertainment profile',
  })
  await expect(templateRow).toContainText('v1')
  await expect(templateRow).toContainText('1 field')

  const editButton = templateRow.getByRole('button', { name: 'Edit profile card' })
  await editButton.click()
  await page.getByTestId('worldbook-profile-template-title').fill('Unsaved profile name')
  await page.getByTestId('worldbook-profile-template-cancel').click()
  await expect(templateRow).toContainText('Manual entertainment profile')
  await expect(templateRow).not.toContainText('Unsaved profile name')

  await editButton.click()
  await page.getByTestId('worldbook-profile-template-title').fill('Manual entertainment profile v2')
  await page.getByTestId('worldbook-profile-template-save').click()
  await expect(page.locator('.worldbook-template-row').filter({
    hasText: 'Manual entertainment profile v2',
  })).toContainText('v2')
  await expectNoHorizontalOverflow(page)

  expect(pageErrors).toEqual([])
})

test('WorldBook world suggestions stay draft-only until explicitly saved', async ({ page }) => {
  const pageErrors = []
  page.on('pageerror', (error) => {
    pageErrors.push(error.message)
  })

  await unlockToHome(page)
  await navigateInsideUnlockedApp(page, '/worldbook')
  await page.getByTestId('worldbook-panel-tab-pack').click()
  await page.getByTestId('worldbook-current-pack-select').selectOption('fandom_parallel')
  await page.getByTestId('worldbook-current-pack-activate').click()
  await expect(page.getByTestId('worldbook-current-pack-state')).toContainText('Active')

  await page.getByTestId('worldbook-panel-tab-templates').click()
  await page.getByTestId('worldbook-profile-template-propose').click()
  await expect(page.getByTestId('worldbook-profile-template-proposal-review')).toContainText(
    'Rule-based review draft',
  )
  await expect(page.getByTestId('worldbook-profile-template-editor')).toContainText('Stage name')
  await expect(page.getByTestId('worldbook-profile-template-editor')).toContainText('Group role')
  await expectNoHorizontalOverflow(page)

  await page.getByTestId('worldbook-profile-template-cancel').click()
  await expect(page.getByTestId('worldbook-profile-template-editor')).toHaveCount(0)
  await expect(
    page.locator('.worldbook-template-row').filter({ hasText: 'Fandom profile suggestion' }),
  ).toHaveCount(0)

  await page.getByTestId('worldbook-profile-template-propose').click()
  await page.getByTestId('worldbook-profile-template-title').fill('Generated fandom profile')
  await page.getByTestId('worldbook-profile-template-save').click()
  const generatedTemplate = page.locator('.worldbook-template-row').filter({
    hasText: 'Generated fandom profile',
  })
  await expect(generatedTemplate).toContainText('v1')
  await expectNoHorizontalOverflow(page)

  expect(pageErrors).toEqual([])
})

test('Contacts persona review confirms one revision and fails closed on desktop and mobile', async ({
  page,
}, testInfo) => {
  const pageErrors = []
  let classificationRequestCount = 0
  const isMobile = testInfo.project.name === 'mobile-chrome'
  page.on('pageerror', (error) => {
    pageErrors.push(error.message)
  })
  await seedPersonaClassificationFixture(page, {
    language: isMobile ? 'zh-CN' : 'en-US',
    night: isMobile,
  })
  await page.route('https://persona-classification.provider.test/**', async (route) => {
    classificationRequestCount += 1
    const payload = route.request().postDataJSON()
    const prompt = String(payload?.messages?.at(-1)?.content || '')
    expect(prompt).toContain('review-only')
    expect(prompt).toContain('Occupation')
    if (classificationRequestCount <= 2) {
      expect(prompt).toContain('Agency: Galaxy Entertainment')
      expect(prompt).toContain('Occupation: Actor')
      expect(prompt).toContain('Stage name: Livia')
      expect(prompt).toContain('Avoids using a full name in private.')
    }
    if (classificationRequestCount === 3) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'access-control-allow-origin': '*' },
        body: JSON.stringify({ choices: [{ message: { content: 'not json' } }] }),
      })
      return
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: { 'access-control-allow-origin': '*' },
      body: JSON.stringify({
        choices: [
          {
            message: {
              content: JSON.stringify({
                matches: [
                  {
                    fieldId: 'agency',
                    value: 'Galaxy Entertainment',
                    sourceText: 'Agency: Galaxy Entertainment',
                  },
                  {
                    fieldId: 'occupation',
                    value: 'Actor',
                    sourceText: 'Occupation: Actor',
                  },
                ],
                newFields: [
                  {
                    label: 'Stage name',
                    value: 'Livia',
                    sourceText: 'Stage name: Livia',
                  },
                ],
              }),
            },
          },
        ],
      }),
    })
  })

  await unlockToHome(page)
  await navigateInsideUnlockedApp(page, '/contacts')
  await page.getByTestId(`contacts-row-${personaProfileId}`).click()
  await page.getByTestId('contacts-open-world-fields-sheet').click()
  const beforeProfile = await readPersistedPersonaProfile(page)

  await page.getByTestId('contacts-open-persona-classification').click()
  await expect(page.getByTestId('contacts-persona-classification-panel')).toContainText(
    isMobile ? '只整理复核草稿' : 'review draft only',
  )
  await page.getByTestId('contacts-persona-source').fill(personaSourceText)
  await page.getByTestId('contacts-classify-persona').click()

  await expect(page.getByTestId('contacts-persona-classification-summary')).toContainText('1')
  await expect(page.getByTestId('contacts-persona-matched-values')).toContainText(
    'Galaxy Entertainment',
  )
  await expect(page.getByTestId('contacts-persona-suggested-fields')).toContainText('Stage name')
  await expect(page.getByTestId('contacts-persona-conflicts')).toContainText('Singer')
  await expect(page.getByTestId('contacts-persona-conflicts')).toContainText('Actor')
  await expect(page.getByTestId('contacts-persona-unclassified')).toContainText(
    'Avoids using a full name in private.',
  )
  await expect(page.getByTestId('contacts-persona-source-retained')).toContainText(
    'Agency: Galaxy Entertainment',
  )
  await expect(page.getByTestId('contacts-persona-classification-panel')).toContainText(
    isMobile ? '接受' : 'Accept',
  )
  const accessibility = await new AxeBuilder({ page })
    .include('[data-testid="contacts-persona-classification-panel"]')
    .analyze()
  expect(accessibility.violations).toEqual([])
  await expectNoHorizontalOverflow(page)
  expect(await readPersistedPersonaProfile(page)).toBe(beforeProfile)

  await page.getByTestId('contacts-close-persona-classification').click()
  await expect(page.getByTestId('contacts-persona-classification-panel')).toHaveCount(0)
  expect(await readPersistedPersonaProfile(page)).toBe(beforeProfile)

  await page.getByTestId('contacts-open-persona-classification').click()
  await page.getByTestId('contacts-persona-source').fill(personaSourceText)
  await page.getByTestId('contacts-classify-persona').click()
  await expect(page.getByTestId('contacts-persona-confirmation')).toBeVisible()
  await page
    .getByTestId('contacts-persona-value-persona-item-field-occupation')
    .fill('Screen actor')
  await page.getByTestId('contacts-persona-accept-persona-item-field-agency').click()
  await page.getByTestId('contacts-persona-accept-persona-item-field-occupation').click()
  await page.getByTestId('contacts-persona-accept-persona-item-new-2').click()
  await page.getByTestId('contacts-persona-ignore-persona-item-unclassified-3').click()
  await expect(page.getByTestId('contacts-save-persona-confirmation')).toBeEnabled()
  await page.getByTestId('contacts-save-persona-confirmation').click()
  await page.locator('.app-dialog-button:not(.app-dialog-button-secondary)').click()
  await expect(page.getByTestId('contacts-persona-classification-panel')).toHaveCount(0)

  const savedProfile = JSON.parse(await readPersistedPersonaProfile(page))
  expect(savedProfile.revision).toBe(8)
  expect(savedProfile.profileValues).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ fieldId: 'occupation', value: 'Screen actor', sourceKind: 'manual' }),
      expect.objectContaining({ fieldId: 'agency', value: 'Galaxy Entertainment', sourceKind: 'manual' }),
      expect.objectContaining({ value: 'Livia', sourceKind: 'manual' }),
    ]),
  )
  await expectNoHorizontalOverflow(page)

  const afterSave = await readPersistedPersonaProfile(page)
  await page.getByTestId('contacts-open-persona-classification').click()
  await page.getByTestId('contacts-persona-source').fill('Occupation: Director')
  await page.getByTestId('contacts-classify-persona').click()
  await expect(page.getByTestId('contacts-persona-classification-error')).toBeVisible()
  expect(await readPersistedPersonaProfile(page)).toBe(afterSave)
  await expectNoHorizontalOverflow(page)

  expect(classificationRequestCount).toBe(3)
  expect(pageErrors).toEqual([])
})
