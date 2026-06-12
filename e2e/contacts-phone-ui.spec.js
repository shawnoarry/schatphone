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

const seedContactsSnapshot = async (page) => {
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
  await expect(search).toHaveAttribute('placeholder', 'Search name, role ID, or world fields')
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

  await expect(page.getByTestId('contacts-recent-2')).toContainText('Main contact')
  await page.getByTestId('contacts-recent-2').click()
  await expect(page.getByTestId('contacts-role-detail')).toContainText('Main contact')
  await expect(page.getByTestId('contacts-row-2')).toContainText('Main contact')

  await search.fill('World NPC')
  await expect(page.getByTestId('contacts-row-2')).toHaveCount(0)
  await expect(page.getByTestId('contacts-row-3')).toContainText('World NPC')

  await expectNoHorizontalOverflow(page)
})
