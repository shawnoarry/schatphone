import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { navigateInsideUnlockedApp, unlockToHome } from './helpers/navigation.js'

const FOOD_DELIVERY_STORAGE_KEY = 'schatphone:store:food-delivery'
const WALLET_STORAGE_KEY = 'schatphone:store:wallet'

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

const readPersistedData = async (page, storageKey) =>
  page.evaluate((key) => {
    const raw = window.localStorage.getItem(key)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return parsed?.data || parsed
  }, storageKey)

const openFoodDeliveryFolderEntry = async (page, entryId) => {
  await page.getByTestId('home-folder-app_food_delivery').click()
  await expect(page.getByTestId('home-folder-overlay')).toBeVisible()
  await page.getByTestId(`home-folder-entry-${entryId}`).click()
}

const expectMinimumControlSize = async (locator) => {
  const box = await locator.boundingBox()
  expect(box?.height || 0).toBeGreaterThanOrEqual(44)
  expect(box?.width || 0).toBeGreaterThanOrEqual(44)
}

test('Moon Bistro order support stays folded until opened and records a delivered order explicitly', async ({
  page,
}, testInfo) => {
  const pageErrors = []
  page.on('pageerror', (error) => pageErrors.push(error.message))

  const simulatedMobile = testInfo.project.name === 'mobile-chrome'
  const language = simulatedMobile ? 'zh-CN' : 'en-US'
  await page.addInitScript((systemLanguage) => {
    window.localStorage.setItem(
      'schatphone:store:system',
      JSON.stringify({
        version: 1,
        savedAt: Date.now(),
        data: {
          settings: {
            system: {
              language: systemLanguage,
            },
          },
        },
      }),
    )
  }, language)
  await page.emulateMedia({ reducedMotion: 'reduce' })

  await unlockToHome(page)
  await navigateInsideUnlockedApp(page, '/home?homePage=1')
  await openFoodDeliveryFolderEntry(page, 'shop_app_food_seed_moon_bistro')
  await expect(page).toHaveURL(/restaurantId=food_seed_moon_bistro/)
  await expect(page).toHaveURL(/from=home/)
  await expect(page).toHaveURL(/homePage=1/)
  await expect(page.getByTestId('food-delivery-store-support-drawer')).toHaveCount(0)

  const storeHeader = page.getByTestId('food-delivery-generic-store-header')
  await expect(storeHeader).toHaveCSS('position', 'sticky')
  const initialHeaderBox = await storeHeader.boundingBox()
  expect(initialHeaderBox).not.toBeNull()
  const foodDeliveryScroll = page.getByTestId('food-delivery-view')
  await foodDeliveryScroll.evaluate((element) => {
    element.scrollTop = 360
  })
  await expect
    .poll(() => foodDeliveryScroll.evaluate((element) => element.scrollTop))
    .toBeGreaterThan(0)
  const stickyHeaderBox = await storeHeader.boundingBox()
  expect(stickyHeaderBox).not.toBeNull()
  expect(Math.abs(stickyHeaderBox.y - initialHeaderBox.y)).toBeLessThanOrEqual(1)
  await foodDeliveryScroll.evaluate((element) => {
    element.scrollTop = 0
  })

  const addButton = page.locator('[data-testid^="food-delivery-add-"]').first()
  const itemTitle = (await addButton.getAttribute('aria-label')).replace(/^Add |^添加 /, '')
  await addButton.click()
  await expect(page.getByTestId('food-delivery-cart-panel')).toContainText(itemTitle)
  await page.getByTestId('food-delivery-checkout').click()
  await expect(page.getByTestId('food-delivery-checkout-sheet')).toContainText(itemTitle)
  await page.getByTestId('food-delivery-checkout-submit').click()

  const drawer = page.getByTestId('food-delivery-store-support-drawer')
  const summary = page.getByTestId('food-delivery-store-support-summary')
  await expect(drawer).toBeVisible()
  await expect.poll(() => drawer.evaluate((element) => element.open)).toBe(false)
  await expect(page.getByTestId('food-delivery-active-cart-quantity')).toContainText('0')

  await expectMinimumControlSize(summary)
  await summary.click()
  await expect.poll(() => drawer.evaluate((element) => element.open)).toBe(true)

  const deliveryDetails = page.getByTestId('food-delivery-map-handoff')
  const routeSummary = page.getByTestId('food-delivery-map-handoff-route')
  const deliveryAddress = page.getByTestId('food-delivery-map-handoff-address')
  await expect(deliveryDetails).toContainText(/Delivery details|配送详情/)
  await expect(routeSummary).toContainText('Moon Bistro')
  await expect(deliveryAddress).not.toContainText(/Not set|未设置/)
  await expect(page.getByTestId('food-delivery-map-handoff-distance')).toContainText(/km/)
  await expect(page.getByTestId('food-delivery-map-handoff-distance')).toContainText(/min/)

  const drawerText = await drawer.innerText()
  expect(drawerText).not.toMatch(/Check for update|查看配送更新/)
  expect(drawerText).not.toMatch(/Dispatch brief|配送简报/)
  expect(drawerText).toMatch(/Confirm delivery|确认已送达/)
  expect(drawerText).toMatch(/Remove from history|从记录中移除/)
  expect(drawerText).toMatch(/Save to Wallet|保存到 Wallet/)
  expect(drawerText).not.toMatch(
    /Map delivery context|Map handoff boundary|Read-only|Trigger delivery event|Simulation settings|sourcePlan|Map 配送上下文|Map 对接边界|只读提供|触发配送事件|模拟设置/,
  )

  const orderCard = page.locator('[data-testid^="food-delivery-order-"]').first()
  const orderTestId = await orderCard.getAttribute('data-testid')
  const orderId = orderTestId.replace('food-delivery-order-', '')
  await expect(orderCard).toContainText('Moon Bistro')
  await expect(orderCard).toContainText(itemTitle)

  await expect(page.getByTestId(`food-delivery-trigger-event-${orderId}`)).toHaveCount(0)
  await expect(page.locator('[data-testid^="food-delivery-event-surface-"]')).toHaveCount(0)
  const confirmDelivery = page.getByTestId(`food-delivery-mark-delivered-${orderId}`)
  const removeFromHistory = page.getByTestId(`food-delivery-delete-order-${orderId}`)
  for (const control of [confirmDelivery, removeFromHistory]) {
    await expectMinimumControlSize(control)
  }

  const unfocusedStyle = await confirmDelivery.evaluate((element) => {
    const style = window.getComputedStyle(element)
    return { boxShadow: style.boxShadow, outlineStyle: style.outlineStyle }
  })
  await removeFromHistory.focus()
  await page.keyboard.press('Shift+Tab')
  await expect(confirmDelivery).toBeFocused()
  const focusedStyle = await confirmDelivery.evaluate((element) => {
    const style = window.getComputedStyle(element)
    return { boxShadow: style.boxShadow, outlineStyle: style.outlineStyle }
  })
  expect(
    focusedStyle.boxShadow !== unfocusedStyle.boxShadow ||
      focusedStyle.outlineStyle !== unfocusedStyle.outlineStyle,
    'keyboard focus should visibly change the control treatment',
  ).toBe(true)
  expect(
    await confirmDelivery.evaluate((element) => getComputedStyle(element).transitionProperty),
  ).toBe('none')

  const walletBefore = await readPersistedData(page, WALLET_STORAGE_KEY)
  const walletCountBefore = walletBefore?.transactions?.length || 0
  await confirmDelivery.click()

  const walletSuggestion = page.getByTestId(`food-delivery-wallet-suggestion-${orderId}`)
  const sharedMealSelect = page.getByTestId(`food-delivery-shared-meal-contact-${orderId}`)
  const recordButton = page.getByTestId(`food-delivery-transfer-wallet-${orderId}`)
  await expect(walletSuggestion).toContainText('Moon Bistro')
  await expect(page.getByTestId('food-delivery-wallet-suggestions')).toContainText(
    /Nothing is saved to Wallet until you choose Record|选择“记录”前，不会保存到 Wallet/,
  )
  expect((await readPersistedData(page, WALLET_STORAGE_KEY))?.transactions?.length || 0).toBe(
    walletCountBefore,
  )
  await expectMinimumControlSize(sharedMealSelect)
  await expectMinimumControlSize(recordButton)
  await recordButton.click()
  await expect(recordButton).toBeDisabled()
  await expect(recordButton).toContainText(/Recorded|已记录/)

  const walletAfter = await readPersistedData(page, WALLET_STORAGE_KEY)
  expect(walletAfter.transactions).toHaveLength(walletCountBefore + 1)
  expect(
    walletAfter.transactions.find(
      (transaction) =>
        transaction.sourceModule === 'food_delivery_wallet_expense' &&
        transaction.sourceId === orderId,
    ),
  ).toMatchObject({
    counterparty: 'Moon Bistro',
    sourceModule: 'food_delivery_wallet_expense',
    sourceId: orderId,
  })
  await recordButton.click({ force: true })
  expect((await readPersistedData(page, WALLET_STORAGE_KEY)).transactions).toHaveLength(
    walletCountBefore + 1,
  )

  const foodDeliveryState = await readPersistedData(page, FOOD_DELIVERY_STORAGE_KEY)
  expect(foodDeliveryState.cartItems).toEqual([])
  expect(foodDeliveryState.orders.find((order) => order.id === orderId)).toMatchObject({
    restaurantId: 'food_seed_moon_bistro',
    status: 'delivered',
  })

  for (const target of [drawer, routeSummary, deliveryAddress, orderCard, walletSuggestion]) {
    const bounds = await target.evaluate((element) => ({
      clientWidth: element.clientWidth,
      scrollWidth: element.scrollWidth,
    }))
    expect(bounds.scrollWidth).toBeLessThanOrEqual(bounds.clientWidth + 1)
  }
  await expectNoHorizontalOverflow(page)
  await expectNoCriticalAxeViolations(page)
  expect(pageErrors).toEqual([])

  await testInfo.attach(`moon-order-support-${testInfo.project.name}`, {
    body: await page.screenshot(),
    contentType: 'image/png',
  })

  await page.getByTestId('food-delivery-store-home').click()
  await expect(page).toHaveURL(/#\/home\?homePage=1$/)
})
