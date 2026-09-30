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
  roleProfiles: [
    {
      id: 1,
      roleId: '9001',
      name: 'My world self',
      role: 'Self profile',
      entityType: 'self_profile',
      isMain: false,
      bio: 'The user profile inside this test world.',
      profileValues: [{ fieldId: 'school', value: 'North Campus', visibilityLevel: 'public' }],
    },
    {
      id: 2,
      roleId: '9002',
      name: 'Main contact',
      role: 'Classmate',
      entityType: 'main_role',
      isMain: true,
      bio: 'A main relationship contact.',
      templateLink: {
        primaryWorldId: '',
        profileTemplateId: 'preset_basic_modern',
        profileTemplateVersion: 1,
      },
      profileValues: [{ fieldId: 'club', value: 'Drama club', visibilityLevel: 'familiar' }],
    },
    {
      id: 3,
      roleId: '9003',
      name: 'World NPC',
      role: 'Library assistant',
      entityType: 'npc',
      isMain: false,
      bio: 'A lightweight world character.',
    },
  ],
  contacts: [
    {
      id: 1,
      profileId: 2,
      name: 'Main contact',
      kind: 'role',
      relationshipLevel: 60,
      relationshipNote: '',
      lastMessage: 'See you after class.',
    },
  ],
  conversations: {},
  messagesByConversation: {},
}

const relationshipSnapshot = {
  settings: {
    enabled: true,
    autoApplyLowImpact: true,
    requireConfirmationForMajorEffects: true,
  },
  entities: [],
  events: [
    ...Array.from({ length: 5 }, (_, index) => ({
      id: `relationship_event_phone_ui_${index}`,
      entityKey: 'role:2',
      memoryKey: 'phone_ui_shared_memory',
      memoryRole: index === 0 ? 'primary' : 'supporting',
      targetLabel: 'Main contact',
      sourceModule: index % 2 === 0 ? 'relationship_phone_call' : 'relationship_calendar_confirmed_event',
      sourceId: `phone_ui_source_${index}`,
      factType: 'shared_experience',
      summary: `Shared school-day memory ${index + 1}.`,
      intensity: 1,
      metricDeltas: {},
      milestone: '',
      growthTraits: [],
      requiresConfirmation: false,
      status: 'applied',
      effectApplied: true,
      createdAt: Date.UTC(2026, 7, 1, 10, index),
    })),
    ...Array.from({ length: 12 }, (_, index) => ({
      id: `relationship_event_phone_ui_page_${index}`,
      entityKey: 'role:2',
      memoryKey: `phone_ui_page_memory_${index}`,
      memoryRole: 'primary',
      targetLabel: 'Main contact',
      sourceModule: 'relationship_phone_call',
      sourceId: `phone_ui_page_source_${index}`,
      factType: 'shared_experience',
      summary: `Paged school-day memory ${index + 1}.`,
      intensity: 1,
      metricDeltas: {},
      milestone: '',
      growthTraits: [],
      requiresConfirmation: false,
      status: 'applied',
      effectApplied: true,
      createdAt: Date.UTC(2026, 7, 1, 9, index),
    })),
  ],
  memoryReviews: [],
}

const seedContactsSnapshot = async (page) => {
  await page.addInitScript(
    ({ system, chat, relationship }) => {
      if (window.localStorage.getItem('e2e:contacts-phone-seeded') === '1') return
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
      window.localStorage.setItem(
        'schatphone:store:relationship-runtime',
        JSON.stringify({
          version: 1,
          savedAt: Date.now(),
          data: relationship,
        }),
      )
      window.localStorage.setItem('e2e:contacts-phone-seeded', '1')
    },
    { system: systemSnapshot, chat: chatSnapshot, relationship: relationshipSnapshot },
  )
}

const expectNoHorizontalOverflow = async (page) => {
  const hasOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  )
  expect(hasOverflow).toBe(false)
}

const readPersistedProfile = (page, roleId) =>
  page.evaluate((targetRoleId) => {
    const snapshot = JSON.parse(window.localStorage.getItem('schatphone:store:chat') || '{}')
    return snapshot.data?.roleProfiles?.find((profile) => profile.roleId === targetRoleId) || null
  }, roleId)

test.beforeEach(async ({ page, isMobile }) => {
  await page.setViewportSize(isMobile ? { width: 390, height: 844 } : { width: 1280, height: 800 })
  await seedContactsSnapshot(page)
})

test('Contacts opens as a phone contact list on mobile', async ({ page }) => {
  await unlockToHome(page)
  await navigateInsideUnlockedApp(page, '/contacts')

  const search = page.getByTestId('contacts-search-input')
  const myProfile = page.getByTestId('contacts-my-profile-section')
  const recent = page.getByTestId('contacts-recent-interactions')
  const mainSection = page.getByTestId('contacts-section-main')
  const npcSection = page.getByTestId('contacts-section-npc')

  await expect(search).toBeVisible()
  await expect(search).toHaveAttribute('placeholder', 'Search name, ID, or profile info')
  await expect(myProfile).toBeVisible()
  await expect(recent).toBeVisible()
  await expect(mainSection).toBeVisible()
  await expect(npcSection).toBeVisible()

  const positions = await page.evaluate(() => {
    const topOf = (testId) =>
      document.querySelector(`[data-testid="${testId}"]`)?.getBoundingClientRect().top || 0
    return {
      search: topOf('contacts-search-input'),
      myProfile: topOf('contacts-my-profile-section'),
      recent: topOf('contacts-recent-interactions'),
      main: topOf('contacts-section-main'),
      npc: topOf('contacts-section-npc'),
    }
  })
  expect(positions.myProfile).toBeGreaterThan(positions.search)
  expect(positions.recent).toBeGreaterThan(positions.myProfile)
  expect(positions.main).toBeGreaterThan(positions.recent)
  expect(positions.npc).toBeGreaterThan(positions.main)

  await expect(page.getByTestId('contacts-role-detail')).toHaveCount(0)
  await expect(page.getByTestId('contacts-recent-2')).toContainText('Main contact')
  await page.getByTestId('contacts-recent-2').click()
  await expect(page.getByTestId('contacts-role-detail')).toContainText('Main contact')
  await expect(page.getByTestId('contacts-role-id')).toHaveText('ID 9002')
  await page.getByTestId('contacts-open-appearance').click()
  await expect(page.getByTestId('contacts-appearance-sheet')).toContainText('Primary appearance')
  await page.getByTestId('contacts-appearance-file-input').setInputFiles(
    'public/icons/pwa-icon-192.png',
  )
  await expect(page.locator('[data-testid^="contacts-appearance-asset-"]')).toHaveCount(1)
  await expect(page.locator('[data-testid^="contacts-appearance-asset-"]').first()).toContainText(
    'Current primary',
  )
  const appearanceAccessibility = await new AxeBuilder({ page })
    .include('[data-testid="contacts-appearance-sheet"]')
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze()
  expect(appearanceAccessibility.violations).toEqual([])
  await expectNoHorizontalOverflow(page)

  await page.getByTestId('contacts-open-appearance-gallery').click()
  await expect(page).toHaveURL(/#\/gallery\?person=2$/)
  await navigateInsideUnlockedApp(page, '/contacts?profileId=2')
  await page.getByTestId('contacts-open-appearance').click()
  await page.getByTestId('contacts-open-appearance-camera').click()
  await expect(page).toHaveURL(/#\/camera\?from=contacts&profileId=2$/)
  await navigateInsideUnlockedApp(page, '/contacts?profileId=2')

  await expect(page.getByTestId('contacts-person-profile-summary')).toContainText('Persona')
  await expect(page.getByTestId('contacts-open-persona-classification')).toContainText(
    'Import persona',
  )
  await expect(page.getByTestId('contacts-persona-fill-from-overview')).toBeVisible()

  await page.getByTestId('contacts-persona-fill-from-overview').click()
  await expect(page.getByTestId('contacts-world-profile-fields-editor')).toContainText(
    'Edit Main contact\'s profile',
  )
  await expect(page.getByTestId('contacts-world-profile-fields-editor')).toContainText(
    'Profile style',
  )
  await expect(page.getByTestId('contacts-world-profile-fields-editor')).toContainText(
    'Who can read this',
  )
  await expect(page.locator('.contacts-world-field-type-chip')).toHaveCount(0)
  await page.getByTestId('contacts-cancel-world-profile-fields').click()
  await page.getByTestId('contacts-detail-sheet-back').click()
  await page.getByTestId('contacts-open-persona-classification').click()
  await expect(page.getByTestId('contacts-persona-classification-panel')).toContainText(
    'Organize Main contact\'s persona',
  )
  await expect(page.getByTestId('contacts-persona-classification-panel')).toContainText(
    'review draft only',
  )
  await page.getByTestId('contacts-close-persona-classification').click()
  await page.getByTestId('contacts-detail-sheet-back').click()

  await page.getByTestId('contacts-open-memories-sheet').click()
  await expect(page.getByTestId('contacts-open-relationship-sheet')).toHaveCount(0)
  await expect(page.getByTestId('contacts-detail-sheet-memories')).toBeVisible()
  const memorySheetTop = await page
    .getByTestId('contacts-detail-sheet-memories')
    .evaluate((element) => element.getBoundingClientRect().top)
  expect(memorySheetTop).toBeLessThan(130)
  await expect(page.getByTestId('contacts-memory-health-status')).toContainText('Starting to fill up')
  await expect(page.getByTestId('contacts-memory-health')).toContainText(
    'Nothing will change automatically',
  )
  await page.getByTestId('contacts-memory-health-open-phone_ui_shared_memory').click()
  await expect(page.getByTestId('contacts-memory-detail')).toContainText('Shared school-day memory 5.')
  await expect(page.getByTestId('contacts-memory-pagination')).toBeVisible()
  await page.getByTestId('contacts-memory-page-next').click()
  await expect(page.getByTestId('contacts-memory-open-phone_ui_shared_memory')).toHaveCount(0)
  await expect(page.getByTestId('contacts-memory-page-previous')).toBeEnabled()
  await page.getByTestId('contacts-memory-page-previous').click()
  await expect(page.getByTestId('contacts-memory-open-phone_ui_shared_memory')).toBeVisible()

  await page.getByTestId('contacts-detail-sheet-back').click()
  await expect(page.getByTestId('contacts-open-memories-sheet')).toBeVisible()
  await page.getByTestId('contacts-profile-back').click()
  await expect(page.getByTestId('contacts-row-2')).toContainText('Main contact')
  await search.fill('World NPC')
  await expect(page.getByTestId('contacts-row-2')).toHaveCount(0)
  await expect(page.getByTestId('contacts-row-3')).toContainText('World NPC')

  await expectNoHorizontalOverflow(page)
})

test('Contacts empty-person authoring restores stable details after cancellation', async ({
  page,
}, testInfo) => {
  const pageErrors = []
  page.on('pageerror', (error) => pageErrors.push(error.message))
  const roleId = '9904'
  const name = 'New empty person'
  const savedIdentity = 'Independent stage designer'
  const unsavedIdentity = 'Discarded identity draft'

  await unlockToHome(page)
  await navigateInsideUnlockedApp(page, '/contacts')
  await page.getByTestId('contacts-add-profile').click()
  await page.getByTestId('contacts-profile-role-id').fill(roleId)
  await page.getByTestId('contacts-profile-name').fill(name)
  await page.getByTestId('contacts-profile-submit').click()
  await expect(page.getByTestId('contacts-profile-modal')).toHaveCount(0)
  await expect(page.getByTestId('contacts-persona-empty-state')).toContainText(name)
  await expect(page.getByTestId('contacts-role-id')).toHaveText(`ID ${roleId}`)
  await expect(page.getByTestId('contacts-open-persona-classification')).toHaveCount(1)
  await expect(page.getByTestId('contacts-persona-fill-from-overview')).toBeVisible()
  await expectNoHorizontalOverflow(page)
  await testInfo.attach('empty-person-overview', {
    body: await page.screenshot(),
    contentType: 'image/png',
  })
  await expect.poll(() => readPersistedProfile(page, roleId)).not.toBeNull()
  const emptyProfile = await readPersistedProfile(page, roleId)
  expect(emptyProfile.profileValues).toEqual([])

  // A person without a profile style enters the existing editor before persona review.
  await page.getByTestId('contacts-open-persona-classification').click()
  await expect(page.getByTestId('contacts-world-profile-fields-editor')).toBeVisible()
  await expect(page.getByTestId('contacts-persona-classification-panel')).toHaveCount(0)
  await page.getByTestId('contacts-cancel-world-profile-fields').click()
  await page.getByTestId('contacts-detail-sheet-back').click()
  await expect(page.getByTestId('contacts-persona-empty-state')).toBeVisible()
  expect(await readPersistedProfile(page, roleId)).toEqual(emptyProfile)

  await page.getByTestId('contacts-persona-fill-from-overview').click()
  await page.getByTestId('contacts-profile-template-select').selectOption('preset_basic_modern')
  await page.getByTestId('contacts-profile-template-value-identity').fill(unsavedIdentity)
  await expectNoHorizontalOverflow(page)
  await page.getByTestId('contacts-cancel-world-profile-fields').click()
  await expect(page.getByTestId('contacts-world-profile-fields-editor')).toHaveCount(0)
  expect(await readPersistedProfile(page, roleId)).toEqual(emptyProfile)
  await page.getByTestId('contacts-detail-sheet-back').click()

  await page.getByTestId('contacts-persona-fill-from-overview').click()
  await page.getByTestId('contacts-profile-template-select').selectOption('preset_basic_modern')
  await expect(page.getByTestId('contacts-profile-template-value-identity')).toHaveValue('')
  await page.getByTestId('contacts-profile-template-value-identity').fill(savedIdentity)
  await page.getByTestId('contacts-profile-template-value-life_habit').fill('Tea, Evening walks')
  await page.getByTestId('contacts-save-world-profile-fields').click()
  await expect(page.getByTestId('contacts-world-field-identity')).toContainText(savedIdentity)
  await page.getByTestId('contacts-detail-sheet-back').click()
  await expect(page.getByTestId('contacts-persona-empty-state')).toHaveCount(0)
  const readableGroups = page.getByTestId('contacts-persona-readable-groups')
  await expect(readableGroups).toContainText(savedIdentity)
  await expect(readableGroups).toContainText('Evening walks')
  await expect.poll(async () => (await readPersistedProfile(page, roleId))?.revision)
    .toBe(emptyProfile.revision + 1)
  const savedProfile = await readPersistedProfile(page, roleId)

  await page.getByTestId('contacts-persona-fill-from-overview').click()
  await expect(page.getByTestId('contacts-profile-template-value-identity')).toHaveValue(savedIdentity)
  await page.getByTestId('contacts-profile-template-value-identity').fill(unsavedIdentity)
  await page.getByTestId('contacts-cancel-world-profile-fields').click()
  await expect(page.getByTestId('contacts-world-field-identity')).toContainText(savedIdentity)
  await expect(page.getByTestId('contacts-world-profile-fields-section')).not.toContainText(unsavedIdentity)
  await page.getByTestId('contacts-detail-sheet-back').click()
  expect(await readPersistedProfile(page, roleId)).toEqual(savedProfile)

  await page.getByTestId('contacts-open-persona-classification').click()
  const source = page.getByTestId('contacts-persona-source')
  await source.fill('Pasted persona that will not be saved.')
  await expect(page.getByTestId('contacts-world-profile-category-list')).toHaveCount(0)
  await page.getByTestId('contacts-persona-source-file').setInputFiles({
    name: 'persona.md',
    mimeType: 'text/markdown',
    buffer: Buffer.from('# Draft persona\nLikes quiet rehearsals.'),
  })
  await expect(source).toHaveValue('# Draft persona\nLikes quiet rehearsals.')
  await page.getByTestId('contacts-persona-source-file').setInputFiles({
    name: 'persona.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{"identity":"Unsaved imported identity","habits":["Reading"]}'),
  })
  const importedText = JSON.stringify({
    identity: 'Unsaved imported identity',
    habits: ['Reading'],
  }, null, 2)
  await expect(source).toHaveValue(importedText)
  await page.getByTestId('contacts-persona-source-file').setInputFiles({
    name: 'invalid.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{invalid'),
  })
  await expect(page.getByTestId('contacts-persona-classification-error')).toContainText(
    'current input was kept',
  )
  await expect(source).toHaveValue(importedText)
  const accessibility = await new AxeBuilder({ page })
    .include('[data-testid="contacts-persona-classification-panel"]')
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze()
  expect(accessibility.violations).toEqual([])
  await expectNoHorizontalOverflow(page)
  expect(await readPersistedProfile(page, roleId)).toEqual(savedProfile)

  await page.getByTestId('contacts-close-persona-classification').click()
  await expect(page.getByTestId('contacts-world-profile-category-list')).toBeVisible()
  await expect(page.getByTestId('contacts-world-field-identity')).toContainText(savedIdentity)
  await page.getByTestId('contacts-detail-sheet-back').click()
  await expect(readableGroups).toContainText(savedIdentity)
  await expect(readableGroups).not.toContainText('Unsaved imported identity')
  await expect(page.getByTestId('contacts-role-id')).toHaveText(`ID ${roleId}`)
  await testInfo.attach('restored-person-overview', {
    body: await page.screenshot(),
    contentType: 'image/png',
  })

  await page.getByTestId('contacts-open-persona-classification').click()
  await expect(source).toHaveValue('')
  await expect(page.getByTestId('contacts-persona-imported-file')).toHaveCount(0)
  await expect(page.getByTestId('contacts-persona-classification-error')).toHaveCount(0)
  await page.getByTestId('contacts-close-persona-classification').click()
  await page.getByTestId('contacts-detail-sheet-back').click()
  await page.reload()
  await unlockToHome(page)
  await navigateInsideUnlockedApp(page, `/contacts?profileId=${savedProfile.id}`)
  await expect(readableGroups).toContainText(savedIdentity)
  await expect(readableGroups).not.toContainText(unsavedIdentity)
  expect(await readPersistedProfile(page, roleId)).toEqual(savedProfile)
  await expectNoHorizontalOverflow(page)
  expect(pageErrors).toEqual([])
})

test('Contacts archives, reloads, searches, and restores one person', async ({ page, isMobile }) => {
  await unlockToHome(page)
  await navigateInsideUnlockedApp(page, '/contacts')

  await page.getByTestId('contacts-row-2').click()
  await page.getByTestId('contacts-open-danger-sheet').click()
  await page.getByTestId('contacts-archive-role').click()
  await expect(page.locator('.app-dialog-title')).toHaveText('Archive person')
  await page.locator('.app-dialog-panel').getByRole('button', { name: 'Archive', exact: true }).click()

  await expect(page.getByTestId('contacts-archived-readonly-banner')).toContainText(
    'This person is archived',
  )
  await expect(page.getByTestId('contacts-start-chat')).toHaveCount(0)
  await expectNoHorizontalOverflow(page)

  await page.reload()
  await unlockToHome(page)
  await navigateInsideUnlockedApp(page, '/contacts?profileId=2')
  await expect(page.getByTestId('contacts-archived-readonly-banner')).toBeVisible()
  await page.getByTestId('contacts-profile-back').click()
  await expect(page.getByTestId('contacts-archive-manager')).toBeVisible()
  await expect(page.getByTestId('contacts-archive-count')).toHaveText('1')
  await page.getByTestId('contacts-archive-search-input').fill('Classmate')
  await expect(page.getByTestId('contacts-archive-row-2')).toContainText('Main contact')

  const accessibility = await new AxeBuilder({ page })
    .include('[data-testid="contacts-archive-manager"]')
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze()
  expect(accessibility.violations).toEqual([])

  await page.getByTestId('contacts-archive-row-2').click()
  await page.getByTestId('contacts-restore-role').click()
  await expect(page.locator('.app-dialog-title')).toHaveText('Restore person')
  await page.locator('.app-dialog-panel').getByRole('button', { name: 'Restore', exact: true }).click()
  await expect(page.getByTestId('contacts-archived-readonly-banner')).toHaveCount(0)
  await page.getByTestId('contacts-profile-back').click()
  await expect(page.getByTestId('contacts-row-2')).toContainText('Main contact')

  await page.reload()
  await unlockToHome(page)
  await navigateInsideUnlockedApp(page, '/contacts')
  await expect(page.getByTestId('contacts-row-2')).toContainText('Main contact')
  await expectNoHorizontalOverflow(page)

  if (isMobile) {
    await page.setViewportSize({ width: 844, height: 390 })
    await expectNoHorizontalOverflow(page)
  }
})
