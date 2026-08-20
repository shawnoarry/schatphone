import { expect, test } from '@playwright/test'
import { navigateInsideUnlockedApp, unlockToHome, waitForAppRouteReady } from './helpers/navigation.js'

test('thread menu repair links route to owning surfaces', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      'schatphone:store:system',
      JSON.stringify({
        version: 1,
        savedAt: Date.now(),
        data: {
          settings: { system: { language: 'zh-CN' } },
          user: {
            name: 'V',
            encyclopediaEntries: [
              { id: 'kp_live', title: '生效条目', content: 'live', enabled: true },
              { id: 'kp_disabled', title: '停用条目', content: 'off', enabled: false },
            ],
            knowledgePoints: [
              { id: 'kp_live', title: '生效条目', content: 'live', enabled: true },
              { id: 'kp_disabled', title: '停用条目', content: 'off', enabled: false },
            ],
          },
        },
      }),
    )
    window.localStorage.setItem(
      'schatphone:store:chat',
      JSON.stringify({
        version: 2,
        savedAt: Date.now(),
        data: {
          moduleAvatarOverrides: { selfAvatar: '', defaultContactAvatar: '', contactAvatars: {} },
          moduleIdentity: { avatar: '', nickname: '', anonymityEnabled: false, anonymityScope: 'all', anonymityContactIds: [] },
          roleProfiles: [
            {
              id: 2,
              roleId: '9002',
              name: 'Main contact',
              role: 'Classmate',
              entityType: 'main_role',
              isMain: true,
              bio: '',
              encyclopediaEntryIds: ['kp_live', 'kp_disabled', 'kp_missing'],
              knowledgePointIds: [],
            },
          ],
          contacts: [{ id: 1, profileId: 2, name: 'Main contact', kind: 'role', relationshipLevel: 60, relationshipNote: '' }],
          conversations: {},
          messagesByConversation: {},
        },
      }),
    )
  })
  await unlockToHome(page)
  await navigateInsideUnlockedApp(page, '/chat')
  await page.getByTestId('chat-contact-row-1').click()
  await waitForAppRouteReady(page, '/chat/1')
  await page.getByTestId('chat-thread-menu-toggle').click()
  await page.getByText('AI 与世界设定').click()

  const note = page.getByTestId('thread-worldbook-binding-note')
  await expect(note).toBeVisible()
  await expect(page.getByTestId('thread-worldbook-disabled-link')).toHaveText(/停用 1 条/)
  await expect(page.getByTestId('thread-worldbook-missing-link')).toHaveText(/缺失 1 条/)

  await page.getByTestId('thread-worldbook-disabled-link').click()
  await expect(page).toHaveURL(/\/worldbook.*kp_disabled/)

  await page.goBack()
  await waitForAppRouteReady(page, '/chat/1')
  await page.getByTestId('chat-thread-menu-toggle').click()
  await page.getByText('AI 与世界设定').click()
  await page.getByTestId('thread-worldbook-missing-link').click()
  await expect(page).toHaveURL(/\/contacts\?.*profileId=2/)
})
