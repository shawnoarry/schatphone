import { expect, test } from '@playwright/test'
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

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
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
  await page.getByTestId('contacts-edit-world-profile-fields').click()

  await expect(page.getByTestId('contacts-world-profile-fields-editor')).toBeVisible()
  await expect(page.getByTestId('contacts-profile-template-select')).toContainText('ABO Profile')
  await expect(page.getByTestId('contacts-template-change-review')).toContainText('Save review')
  await page.getByTestId('contacts-profile-template-value-secondary_gender').selectOption('Omega')
  await page.getByTestId('contacts-profile-template-value-pheromone').fill('Cedar rain')
  await page.getByTestId('contacts-profile-template-value-bond_mark').fill('Temporary bond mark')
  await page.getByTestId('contacts-profile-template-visibility-pheromone').selectOption('intimate')
  await expectNoHorizontalOverflow(page)

  await page.getByTestId('contacts-save-world-profile-fields').click()
  await expect(page.getByTestId('contacts-world-profile-fields-editor')).toHaveCount(0)
  await expect(page.getByTestId('contacts-world-field-secondary_gender')).toContainText('Omega')
  await expect(page.getByTestId('contacts-world-field-pheromone')).toContainText('Cedar rain')
  await expect(page.getByTestId('contacts-world-field-pheromone')).toContainText('Intimate')
  await expect(page.getByTestId('contacts-world-field-bond_mark')).toContainText('Temporary bond mark')
  await expectNoHorizontalOverflow(page)

  expect(pageErrors).toEqual([])
})
