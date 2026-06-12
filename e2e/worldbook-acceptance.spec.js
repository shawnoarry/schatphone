import { expect, test } from '@playwright/test'
import { navigateInsideUnlockedApp, unlockToHome } from './helpers/navigation.js'

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

const openVisibleAppStoreAction = async (page) => {
  const inlineAction = page.getByTestId('app-store-open')
  if (await inlineAction.isVisible()) {
    await inlineAction.click()
    return
  }

  await page.getByTestId('app-store-open-sheet').click()
}

test.beforeEach(async ({ page }) => {
  await seedWorldBookSnapshot(page)
})

test('Settings entry opens readable WorldBook V1 overview and current pack shell', async ({ page }) => {
  await unlockToHome(page)

  await navigateInsideUnlockedApp(page, '/settings')
  await page.locator('[data-settings-menu-title="World Book"]').click()
  await expect(page).toHaveURL(/#\/worldbook/)

  await expect(page.getByTestId('worldbook-overview')).toBeVisible()
  await expect(page.getByTestId('worldbook-overview-pack')).toContainText('默认世界')
  await expect(page.getByTestId('worldbook-overview-context-total')).toBeVisible()
  await expect(page.getByTestId('worldbook-overview-text-category-worldview')).toBeVisible()
  await expect(page.getByTestId('worldbook-overview-text-category-rules')).toBeVisible()
  await expect(page.getByTestId('worldbook-overview-text-category-encyclopedia')).toBeVisible()
  await expect(page.getByTestId('worldbook-panel-tab-templates')).toBeVisible()
  await expect(page.getByTestId('worldbook-overview-consumer-chat')).toContainText('聊天')

  await page.getByTestId('worldbook-panel-tab-pack').click()
  await expect(page.getByTestId('worldbook-current-pack')).toBeVisible()
  await expect(page.getByTestId('worldbook-current-pack-state')).toContainText('默认启用')
  await page.getByTestId('worldbook-current-pack-select').selectOption('survival_city')
  await expect(page.getByTestId('worldbook-current-pack-review')).toContainText('灾后生存都市')
  await expect(page.getByTestId('worldbook-current-pack-review')).toContainText('世界应用')
  await expect(page.getByTestId('worldbook-current-pack-review')).toContainText('服务号模板')
  await page.getByTestId('worldbook-current-pack-activate').click()
  await expect(page.getByTestId('worldbook-overview-pack')).toContainText('灾后生存都市')
  await expect(page.getByTestId('worldbook-current-pack-app-bindings')).toContainText('补给站')
  await expect(page.getByTestId('worldbook-current-pack')).toContainText('App Store')
  await navigateInsideUnlockedApp(page, '/app-store?section=world&from=worldbook')
  await page.getByTestId('app-store-item-world_app_survival_city_survival_supply_board').click()
  await expect(page.getByTestId('app-store-world-handoff')).toContainText('灾后生存都市')
  await openVisibleAppStoreAction(page)
  await expect(page).toHaveURL(/#\/shopping\?/)
  await expect(page).toHaveURL(/worldPack=survival_city/)
  await expect(page).toHaveURL(/worldApp=survival_supply_board/)
  await expect(page.getByTestId('shopping-world-app-context')).toContainText('补给站')
  await expect(page.getByTestId('shopping-world-app-boundary')).toContainText('Shopping 仍拥有商品')
  await page.getByTestId('shopping-world-app-apply-filter').click()
  await expect(page).toHaveURL(/worldPack=survival_city/)
  await expect(page).toHaveURL(/worldApp=survival_supply_board/)
  await expect(page).toHaveURL(/service=daily_fresh/)
  await expect(page).toHaveURL(/category=grocery/)

  await navigateInsideUnlockedApp(page, '/worldbook')
  await page.getByTestId('worldbook-panel-tab-pack').click()
  await expect(page.getByTestId('worldbook-current-pack-service-templates')).toContainText('补给调度员')
  await expect(page.getByTestId('worldbook-current-pack-service-handoff')).toContainText('Chat')
  await navigateInsideUnlockedApp(page, '/chat-contacts?section=service')
  await expect(page.getByTestId('chat-directory-world-service-template-survival_supply_dispatch')).toBeVisible()
  await page.getByTestId('chat-directory-join-world-service-survival_supply_dispatch').click()
  await expect(page.getByTestId('chat-directory-open-world-service-survival_supply_dispatch')).toBeVisible()
  await navigateInsideUnlockedApp(page, '/worldbook')
  await page.getByTestId('worldbook-panel-tab-kernel').click()
  await expect(page.getByTestId('worldbook-world-kernel')).toBeVisible()
  await page.getByTestId('worldbook-panel-tab-knowledge').click()
  await expect(page.getByTestId('knowledge-point-card')).toHaveCount(2)

  await expectNoMojibake(page)
  await expectNoHorizontalOverflow(page)
})

test('WorldBook overview stays readable on mobile viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await unlockToHome(page)

  await navigateInsideUnlockedApp(page, '/worldbook')

  await expect(page.getByTestId('worldbook-overview')).toBeVisible()
  await page.getByTestId('worldbook-panel-tab-pack').click()
  await expect(page.getByTestId('worldbook-current-pack')).toBeVisible()
  await page.getByTestId('worldbook-panel-tab-kernel').click()
  await expect(page.getByTestId('worldbook-world-kernel')).toBeVisible()

  await expectNoMojibake(page)
  await expectNoHorizontalOverflow(page)
})
