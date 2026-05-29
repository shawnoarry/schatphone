import { expect, test } from '@playwright/test'

const systemSnapshot = {
  settings: {
    system: {
      language: 'zh-CN',
    },
  },
  user: {
    name: '验收用户',
    globalWorldview: '这座城市以夜间礼仪、稳定关系网和低调的日常秩序为基础。',
    worldBook: '这座城市以夜间礼仪、稳定关系网和低调的日常秩序为基础。',
    knowledgePoints: [
      {
        id: 'kp_city_etiquette',
        title: '城市礼仪',
        content: '公开场合先正式问候，私下交流可以更自然。',
        tags: ['礼仪', '城市'],
        enabled: true,
        createdAt: 1,
        updatedAt: 1,
      },
      {
        id: 'kp_disabled_secret',
        title: '停用暗线',
        content: '这条不应该被注入。',
        tags: ['暗线'],
        enabled: false,
        createdAt: 2,
        updatedAt: 2,
      },
    ],
    profileTemplates: [
      {
        id: 'world_template_acceptance',
        title: '都市关系模板',
        scope: 'world',
        worldId: 'default_world',
        version: 1,
        fields: [
          {
            id: 'public_identity',
            label: '公开身份',
            type: 'short_text',
            order: 1,
          },
        ],
        createdAt: 1,
        updatedAt: 1,
      },
    ],
  },
}

const seedWorldBookSnapshot = async (page) => {
  await page.addInitScript((snapshot) => {
    window.localStorage.setItem(
      'schatphone:store:system',
      JSON.stringify({
        version: 1,
        savedAt: Date.now(),
        data: snapshot,
      }),
    )
  }, systemSnapshot)
}

const expectNoMojibake = async (page) => {
  const bodyText = await page.locator('body').innerText()
  expect(bodyText).not.toMatch(/[�]|涓|璁|妯|鍦|鏃|鑱|淇|锛/)
}

const expectNoHorizontalOverflow = async (page) => {
  const hasOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  )
  expect(hasOverflow).toBe(false)
}

const navigateInsideUnlockedApp = async (page, hashPath) => {
  await page.evaluate((target) => {
    window.location.hash = target
  }, hashPath)
}

test.beforeEach(async ({ page }) => {
  await seedWorldBookSnapshot(page)
})

test('Settings entry opens readable WorldBook V1 overview and current pack shell', async ({ page }) => {
  await page.goto('/#/lock')
  await page.getByRole('button', { name: /解锁进入主屏|Unlock to Home/ }).click()
  await expect(page).toHaveURL(/#\/home/)

  await navigateInsideUnlockedApp(page, '/settings')
  await page.locator('[data-settings-menu-title="World Book"]').click()
  await expect(page).toHaveURL(/#\/worldbook/)

  await expect(page.getByTestId('worldbook-overview')).toBeVisible()
  await expect(page.getByTestId('worldbook-overview-pack')).toContainText('默认世界')
  await expect(page.getByTestId('worldbook-overview-knowledge')).toContainText('1 / 2')
  await expect(page.getByTestId('worldbook-overview-templates')).toContainText('1')
  await expect(page.getByTestId('worldbook-overview-consumer-chat')).toContainText('聊天')

  await expect(page.getByTestId('worldbook-current-pack')).toBeVisible()
  await expect(page.getByTestId('worldbook-current-pack-state')).toContainText('默认启用')
  await expect(page.getByTestId('worldbook-world-kernel')).toBeVisible()
  await expect(page.getByTestId('knowledge-point-card')).toHaveCount(2)

  await expectNoMojibake(page)
  await expectNoHorizontalOverflow(page)
})

test('WorldBook overview stays readable on mobile viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/#/lock')
  await page.getByRole('button', { name: /解锁进入主屏|Unlock to Home/ }).click()

  await navigateInsideUnlockedApp(page, '/worldbook')

  await expect(page.getByTestId('worldbook-overview')).toBeVisible()
  await expect(page.getByTestId('worldbook-current-pack')).toBeVisible()
  await expect(page.getByTestId('worldbook-world-kernel')).toBeVisible()

  await expectNoMojibake(page)
  await expectNoHorizontalOverflow(page)
})
