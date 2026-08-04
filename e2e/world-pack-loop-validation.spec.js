import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import {
  expectHomeReady,
  navigateInsideUnlockedApp,
  waitForAppRouteReady,
  unlockToHome,
} from './helpers/navigation.js'

const packId = 'device_validation_pack'
const homePage = '2'

const entries = [
  {
    bindingId: 'device_supply_market',
    moduleKey: 'shopping',
    route: '/shopping',
    targetLabel: 'Shopping',
    labels: {
      zh: '跨城应急补给与生活物资协调站',
      en: 'EmergencySuppliesCoordinationMarketplace',
    },
  },
  {
    bindingId: 'device_dispatch_center',
    moduleKey: 'food_delivery',
    route: '/food-delivery',
    targetLabel: 'Food Delivery',
    labels: {
      zh: '社区医疗救援与餐食配送调度中心',
      en: 'CommunityMedicalAndMealDispatchCenter',
    },
  },
  {
    bindingId: 'device_reservation_calendar',
    moduleKey: 'calendar',
    route: '/calendar',
    targetLabel: 'Calendar',
    labels: {
      zh: '跨区域预约与公共日程协调看板',
      en: 'RegionalReservationAndScheduleBoard',
    },
  },
  {
    bindingId: 'device_transit_map',
    moduleKey: 'map',
    route: '/map',
    targetLabel: 'Map',
    labels: {
      zh: '城市安全通行与换乘路线凭证',
      en: 'MetropolitanSafeTransitAndRoutePass',
    },
  },
]

const buildWorldPack = (language) => {
  const useChinese = language === 'zh-CN'
  const labelFor = (entry) => (useChinese ? entry.labels.zh : entry.labels.en)

  return {
    id: packId,
    title: useChinese ? '跨区域公共服务与日常协作能力包' : 'Regional Public Services Capability Pack',
    name: 'Regional Public Services Capability Pack',
    description: useChinese
      ? '为现有应用提供经过审核的入口语义，不改变任何目标应用的业务真值。'
      : 'Provides reviewed entry context without changing target-app business truth.',
    source: 'user',
    state: 'available',
    supportState: 'supported',
    appBindings: [
      {
        id: entries[0].bindingId,
        archetype: 'marketplace',
        title: labelFor(entries[0]),
        moduleKey: entries[0].moduleKey,
        route: entries[0].route,
        description: 'Shopping keeps products, cart, checkout, and order truth.',
      },
      {
        id: entries[1].bindingId,
        archetype: 'dispatch',
        title: labelFor(entries[1]),
        moduleKey: entries[1].moduleKey,
        route: entries[1].route,
        description: 'Food Delivery keeps restaurants, menus, carts, and order truth.',
        uiThemePackage: {
          enabled: true,
          themeId: 'regional_dispatch_context',
          styleScope: 'app',
        },
      },
      {
        id: entries[2].bindingId,
        archetype: 'reservation',
        title: labelFor(entries[2]),
        moduleKey: entries[2].moduleKey,
        route: entries[2].route,
        description: 'Calendar keeps confirmed events, time edits, and push truth.',
      },
      {
        id: entries[3].bindingId,
        archetype: 'transit',
        title: labelFor(entries[3]),
        moduleKey: entries[3].moduleKey,
        route: entries[3].route,
        description: 'Map keeps place, route, trip, and ETA truth.',
      },
    ],
    serviceAccountTemplates: [],
  }
}

const seedWorldPackCandidate = async (page, { language, theme }) => {
  await page.addInitScript(
    ({ currentLanguage, currentTheme, worldPack }) => {
      if (window.localStorage.getItem('schatphone:store:system')) return
      const now = Date.now()
      window.localStorage.setItem(
        'schatphone:store:system',
        JSON.stringify({
          version: 1,
          savedAt: now,
          data: {
            settings: {
              system: {
                language: currentLanguage,
                notifications: false,
              },
              appearance: {
                currentTheme,
                wallpaperMode: 'theme',
                homeDesktopSetupVersion: 2,
                homeWidgetPages: [[], [], [], [], []],
                homeLayoutTemplateIds: [
                  'layout-b',
                  'layout-b',
                  'layout-b',
                  'layout-b',
                  'layout-b',
                ],
                homeLayoutSlotPlacements: [[], [], [], [], []],
              },
            },
            user: {
              activeWorldPackId: 'default_world',
              enabledWorldPackIds: [],
              worldPackEnablements: {},
              worldPacks: [worldPack],
              knowledgePoints: [],
              encyclopediaEntries: [],
              worldBookSources: [],
            },
          },
        }),
      )
    },
    {
      currentLanguage: language,
      currentTheme: theme,
      worldPack: buildWorldPack(language),
    },
  )
}

const worldEntryId = (entry) => `world_app_${packId}_${entry.bindingId}`

const readPersistedWorldPlacement = async (page) =>
  page.evaluate(() => {
    const raw = window.localStorage.getItem('schatphone:store:system')
    const data = raw ? JSON.parse(raw)?.data : null
    return {
      activeWorldPackId: data?.user?.activeWorldPackId || '',
      enabledWorldPackIds: data?.user?.enabledWorldPackIds || [],
      pageTiles: data?.settings?.appearance?.homeWidgetPages?.[2] || [],
      placementTiles:
        data?.settings?.appearance?.homeLayoutSlotPlacements?.[2]?.map(
          (placement) => placement.tileId,
        ) || [],
    }
  })

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

const expectTextNotClipped = async (locator) => {
  await expect(locator).toBeVisible()
  const dimensions = await locator.evaluate((element) => ({
    clientWidth: element.clientWidth,
    scrollWidth: element.scrollWidth,
    clientHeight: element.clientHeight,
    scrollHeight: element.scrollHeight,
  }))

  expect(dimensions.scrollWidth, 'text should not be clipped horizontally').toBeLessThanOrEqual(
    dimensions.clientWidth + 1,
  )
  expect(dimensions.scrollHeight, 'text should not be clipped vertically').toBeLessThanOrEqual(
    dimensions.clientHeight + 1,
  )
}

const visibleWorldHandoff = async (page) => {
  const inline = page.getByTestId('app-store-world-handoff')
  if (await inline.isVisible()) return inline
  return page.getByTestId('app-store-world-handoff-sheet')
}

const addSelectedEntryToHome = async (page) => {
  const inline = page.getByTestId('app-store-add-home')
  if (await inline.isVisible()) {
    await inline.click()
    return
  }

  await page
    .getByTestId('app-store-detail-sheet')
    .getByRole('button', { name: /加入主屏|Add to Home/ })
    .click()
}

const placeWorldEntry = async (page, entry, packTitle) => {
  const entryId = worldEntryId(entry)
  await navigateInsideUnlockedApp(page, `/app-store?section=world&homePage=${homePage}`)
  await page.getByTestId(`app-store-item-${entryId}`).click()

  const handoff = await visibleWorldHandoff(page)
  await expect(handoff).toContainText(packTitle)
  await expect(handoff).toContainText(entry.targetLabel)
  await addSelectedEntryToHome(page)

  await expect(page).toHaveURL(/#\/home(?:\?|$)/)
  const candidate = page.getByTestId(`home-library-candidate-${entryId}`)
  await expect(candidate).toBeVisible()
  await expect(candidate).toHaveClass(/is-active/)

  await page.locator(`[data-testid^="home-empty-slot-${homePage}-b-small-"]`).first().click()
  await expect(page.locator(`[data-home-tile-id="${entryId}"]`)).toBeVisible()
  await page.getByTestId('home-edit-done').click()
  await expect(page.getByTestId('home-edit-done')).toHaveCount(0)
}

const expectWorldRouteContext = async (page, entry) => {
  await waitForAppRouteReady(page, entry.route)
  await expect(page).toHaveURL(new RegExp(`worldPack=${packId}`))
  await expect(page).toHaveURL(new RegExp(`worldApp=${entry.bindingId}`))
  await expect(page.locator('.app-shell')).toHaveAttribute('data-world-pack', packId)
  await expect(page.locator('.app-shell')).toHaveAttribute('data-world-app', entry.bindingId)
}

const openPlacedWorldEntry = async (page, entry, language, testInfo) => {
  const entryId = worldEntryId(entry)
  const expectedLabel = language === 'zh-CN' ? entry.labels.zh : entry.labels.en
  await page.locator(`[data-home-tile-id="${entryId}"] .home-app-tile`).click()
  await expectWorldRouteContext(page, entry)

  if (entry.moduleKey === 'shopping') {
    const context = page.getByTestId('shopping-world-app-context')
    const title = page.getByTestId('shopping-world-app-title')
    await expect(context).toContainText('Shopping')
    await expect(title).toHaveText(expectedLabel)
    await expectTextNotClipped(title)
    await page.getByTestId('shopping-world-app-apply-filter').click()
    await expect(page).toHaveURL(/service=daily_fresh/)
    await expect(page).toHaveURL(/category=grocery/)
  } else if (entry.moduleKey === 'food_delivery') {
    const title = page.getByTestId('food-delivery-hero-title')
    await expect(title).toHaveText(expectedLabel)
    await expectTextNotClipped(title)
    await expect(page.getByTestId('food-delivery-category-all')).toHaveClass(/ring-/)
  } else if (entry.moduleKey === 'calendar') {
    const context = page.getByTestId('calendar-world-app-context')
    const title = context.locator('.calendar-world-context__title')
    await expect(title).toHaveText(expectedLabel)
    await expectTextNotClipped(title)
    await expect(page.getByTestId('calendar-empty-events')).toBeVisible()
  } else if (entry.moduleKey === 'map') {
    const context = page.getByTestId('map-world-app-context')
    const title = context.locator('p').first()
    await expect(title).toHaveText(expectedLabel)
    await expectTextNotClipped(title)
    await expect(page.getByTestId('map-primary-start-trip')).toContainText(
      language === 'zh-CN' ? '开始行程' : 'Start trip',
    )
  }

  await expectNoHorizontalOverflow(page)
  await expectNoCriticalAxeViolations(page)
  await testInfo.attach(`world-pack-${entry.moduleKey}-${testInfo.project.name}.png`, {
    body: await page.screenshot({ animations: 'disabled' }),
    contentType: 'image/png',
  })

  if (entry.moduleKey === 'food_delivery') {
    await page.getByTestId('food-delivery-go-home').click()
  } else if (entry.moduleKey === 'map') {
    await page.getByTestId('map-go-home').click()
  } else {
    await page.getByRole('button', { name: /^(首页|Home)$/ }).first().click()
  }
  await expectHomeReady(page)
}

test('World Pack loop keeps placement, target ownership, and disabled safe defaults', async ({
  page,
}, testInfo) => {
  testInfo.setTimeout(60_000)
  const simulatedPhone = testInfo.project.name === 'mobile-chrome'
  const language = simulatedPhone ? 'zh-CN' : 'en-US'
  const theme = simulatedPhone ? 'zen' : 'default'
  const worldPack = buildWorldPack(language)
  const pageErrors = []
  page.on('pageerror', (error) => pageErrors.push(error.message))

  await page.emulateMedia({ reducedMotion: 'reduce' })
  await seedWorldPackCandidate(page, { language, theme })
  await unlockToHome(page)
  await expect(page.locator('.app-shell')).toHaveAttribute('data-theme', theme)

  await navigateInsideUnlockedApp(page, '/app-store?section=world')
  await expect(page.getByTestId('app-store-empty')).toBeVisible()

  await navigateInsideUnlockedApp(page, '/worldbook')
  await page.getByTestId('worldbook-panel-tab-pack').click()
  await expect(page.getByTestId('worldbook-current-pack-state')).toContainText(
    language === 'zh-CN' ? '未启用额外能力包' : 'No extra Pack',
  )
  await page.getByTestId('worldbook-current-pack-select').selectOption(packId)
  await expect(page.getByTestId('worldbook-current-pack-review')).toContainText(worldPack.title)
  await page.getByTestId('worldbook-current-pack-activate').click()
  await expect(page.getByTestId(`worldbook-enabled-pack-${packId}`)).toBeVisible()
  await expect(page.getByTestId('worldbook-current-pack-app-bindings')).toContainText(
    language === 'zh-CN' ? entries[0].labels.zh : entries[0].labels.en,
  )
  await expectNoHorizontalOverflow(page)
  await expectNoCriticalAxeViolations(page)
  await testInfo.attach(`world-pack-activated-${testInfo.project.name}.png`, {
    body: await page.screenshot({ animations: 'disabled' }),
    contentType: 'image/png',
  })

  for (const entry of entries) {
    await placeWorldEntry(page, entry, worldPack.title)
  }

  const expectedEntryIds = entries.map((entry) => worldEntryId(entry))
  await expect
    .poll(() => readPersistedWorldPlacement(page))
    .toMatchObject({
      activeWorldPackId: packId,
      enabledWorldPackIds: [packId],
      pageTiles: expectedEntryIds,
      placementTiles: expectedEntryIds,
    })

  await page.reload()
  await expect(readPersistedWorldPlacement(page)).resolves.toMatchObject({
    activeWorldPackId: packId,
    enabledWorldPackIds: [packId],
    pageTiles: expectedEntryIds,
    placementTiles: expectedEntryIds,
  })
  await unlockToHome(page)
  await navigateInsideUnlockedApp(page, `/home?homePage=${homePage}`)
  await expectHomeReady(page)
  for (const entry of entries) {
    await expect(page.locator(`[data-home-tile-id="${worldEntryId(entry)}"]`)).toBeVisible()
  }
  await expectNoHorizontalOverflow(page)
  await expectNoCriticalAxeViolations(page)
  await testInfo.attach(`world-pack-home-placement-${testInfo.project.name}.png`, {
    body: await page.screenshot({ animations: 'disabled' }),
    contentType: 'image/png',
  })

  for (const entry of entries) {
    await openPlacedWorldEntry(page, entry, language, testInfo)
  }

  await navigateInsideUnlockedApp(page, '/worldbook')
  await page.getByTestId('worldbook-panel-tab-pack').click()
  await page.getByTestId(`worldbook-disable-pack-${packId}`).click()
  await expect(page.getByTestId(`worldbook-enabled-pack-${packId}`)).toHaveCount(0)

  await page.reload()
  await unlockToHome(page)
  await navigateInsideUnlockedApp(page, '/worldbook')
  await page.getByTestId('worldbook-panel-tab-pack').click()
  await expect(page.getByTestId('worldbook-current-pack-state')).toContainText(
    language === 'zh-CN' ? '未启用额外能力包' : 'No extra Pack',
  )

  await navigateInsideUnlockedApp(page, '/app-store?section=world')
  await expect(page.getByTestId('app-store-empty')).toBeVisible()
  for (const entry of entries) {
    await expect(page.getByTestId(`app-store-item-${worldEntryId(entry)}`)).toHaveCount(0)
  }

  await navigateInsideUnlockedApp(
    page,
    `/shopping?worldPack=${packId}&worldApp=${entries[0].bindingId}`,
  )
  await expect(page.getByTestId('shopping-world-app-context')).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'Shopping', level: 1 })).toBeVisible()
  await expectNoHorizontalOverflow(page)
  await expectNoCriticalAxeViolations(page)

  await navigateInsideUnlockedApp(page, `/home?homePage=${homePage}`)
  for (const entry of entries) {
    await expect(page.locator(`[data-home-tile-id="${worldEntryId(entry)}"]`)).toHaveCount(0)
  }
  expect(pageErrors).toEqual([])
})
