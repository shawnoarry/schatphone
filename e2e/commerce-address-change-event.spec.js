import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { navigateInsideUnlockedApp, unlockToHome } from './helpers/navigation.js'

const FOOD_DELIVERY_STORAGE_KEY = 'schatphone:store:food-delivery'
const MAP_STORAGE_KEY = 'schatphone:store:map'
const PHONE_STORAGE_KEY = 'schatphone:store:phone'
const SIMULATION_STORAGE_KEY = 'schatphone:store:simulation'
const WALLET_STORAGE_KEY = 'schatphone:store:wallet'
const FIXED_NOW = new Date('2026-08-14T03:00:00.000Z')
const VISUAL_EVIDENCE_DIR = fileURLToPath(
  new URL('../output/e2e/commerce-address-change-event/', import.meta.url),
)

const readPersistedData = async (page, storageKey) =>
  page.evaluate((key) => {
    const envelope = JSON.parse(window.localStorage.getItem(key) || 'null')
    return envelope?.data || envelope || null
  }, storageKey)

const expectNoHorizontalOverflow = async (page, testId = '') => {
  const overflow = await page.evaluate((targetTestId) => {
    const target = targetTestId
      ? document.querySelector(`[data-testid="${targetTestId}"]`)
      : null
    return {
      document: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      body: document.body.scrollWidth - document.body.clientWidth,
      target: target instanceof HTMLElement ? target.scrollWidth - target.clientWidth : 0,
    }
  }, testId)

  expect(overflow.document, 'document should not overflow horizontally').toBeLessThanOrEqual(1)
  expect(overflow.body, 'body should not overflow horizontally').toBeLessThanOrEqual(1)
  expect(overflow.target, `${testId || 'target'} should not overflow horizontally`).toBeLessThanOrEqual(1)
}

const expectNoCriticalAxeViolations = async (page, include) => {
  const builder = new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
  if (include) builder.include(include)
  const accessibility = await builder.analyze()
  const criticalViolations = accessibility.violations.filter(
    (violation) => violation.impact === 'critical',
  )
  expect(criticalViolations).toEqual([])
  return accessibility
}

const captureEvidence = async (page, testInfo, name) => {
  await mkdir(VISUAL_EVIDENCE_DIR, { recursive: true })
  const filename = `${testInfo.project.name}-${name}.png`
  const body = await page.screenshot({
    path: join(VISUAL_EVIDENCE_DIR, filename),
    animations: 'disabled',
  })
  await testInfo.attach(filename, { body, contentType: 'image/png' })
}

const seedDeterministicRuntime = async (page, language) => {
  await page.clock.install({ time: FIXED_NOW })
  await page.clock.pauseAt(FIXED_NOW)
  await page.addInitScript((systemLanguage) => {
    let fallbackState = 0x12345678
    Math.random = () => {
      const stack = new Error().stack || ''
      if (stack.includes('createFoodOrderId')) return 0.02
      fallbackState = (1664525 * fallbackState + 1013904223) >>> 0
      return fallbackState / 0x100000000
    }
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
}

const openMoonBistro = async (page) => {
  await page.getByTestId('home-folder-app_food_delivery').click()
  await expect(page.getByTestId('home-folder-overlay')).toBeVisible()
  await page.getByTestId('home-folder-entry-shop_app_food_seed_moon_bistro').click()
  await expect(page).toHaveURL(/restaurantId=food_seed_moon_bistro/)
}

test('user-initiated address support closes through Food Delivery, Phone, Wallet, and Map', async ({
  page,
}, testInfo) => {
  const pageErrors = []
  page.on('pageerror', (error) => pageErrors.push(error.message))
  const simulatedPixel5 = testInfo.project.name === 'mobile-chrome'
  const language = simulatedPixel5 ? 'zh-CN' : 'en-US'

  await page.emulateMedia({ reducedMotion: 'reduce' })
  await seedDeterministicRuntime(page, language)
  await unlockToHome(page)
  await navigateInsideUnlockedApp(page, '/home?homePage=1')
  await openMoonBistro(page)

  const addButton = page.locator('[data-testid^="food-delivery-add-"]').first()
  await addButton.click()
  await page.getByTestId('food-delivery-checkout').click()
  await page.getByTestId('food-delivery-checkout-submit').click()

  const foodAfterCheckout = await readPersistedData(page, FOOD_DELIVERY_STORAGE_KEY)
  const order = foodAfterCheckout.orders[0]
  expect(order.id).toMatch(/^food_order_1786676400000_0px4bi/)
  expect(order.paymentStatus).toBe('completed')
  expect(order.deliveryJourneyId).toBeTruthy()
  const walletAfterCheckout = await readPersistedData(page, WALLET_STORAGE_KEY)
  expect(
    walletAfterCheckout.transactions.find(
      (transaction) =>
        transaction.sourceModule === 'wallet_commerce_payment' &&
        transaction.sourceId === order.id,
    ),
  ).toMatchObject({ paymentStatus: 'completed' })

  const supportDrawer = page.getByTestId('food-delivery-store-support-drawer')
  await expect(supportDrawer).toBeVisible()
  if (!(await supportDrawer.evaluate((element) => element.open))) {
    await page.getByTestId('food-delivery-store-support-summary').click()
    await expect.poll(() => supportDrawer.evaluate((element) => element.open)).toBe(true)
  }
  await page.getByTestId(`food-delivery-open-order-${order.id}`).click()
  const orderChain = page.getByTestId('food-delivery-order-chain')
  await expect(orderChain).toBeVisible()

  const mapAfterCheckout = await readPersistedData(page, MAP_STORAGE_KEY)
  const journey = mapAfterCheckout.deliveryJourneys.find((item) => item.id === order.deliveryJourneyId)
  await page.clock.fastForward(journey.riderPickupAt - FIXED_NOW.getTime() + 1_000)
  await page.getByRole('button', {
    name: simulatedPixel5 ? '刷新订单状态' : 'Refresh order status',
  }).click()
  await expect(orderChain).toContainText(simulatedPixel5 ? '配送员已取餐' : 'Rider picked up')

  const addressSelect = page.getByTestId('food-delivery-order-address-select')
  const originalAnchorId = await addressSelect.inputValue()
  const alternateAnchor = await addressSelect.locator('option').evaluateAll(
    (options, currentId) =>
      options
        .map((option) => ({ value: option.value, label: option.textContent || '' }))
        .find((option) => option.value && option.value !== currentId),
    originalAnchorId,
  )
  expect(alternateAnchor).toBeTruthy()
  await addressSelect.selectOption(alternateAnchor.value)
  await page.getByTestId('food-delivery-order-message-input').fill(
    simulatedPixel5
      ? '配送地址填错了，请改到刚刚选择的新地址。'
      : 'The delivery address is wrong. Please use the newly selected destination.',
  )
  await page.getByTestId('food-delivery-order-send-address').click()
  await expect(page.getByTestId('food-delivery-order-feedback')).toContainText(
    simulatedPixel5 ? '改址请求已记录' : 'Address request recorded',
  )
  await expect(orderChain).toContainText(
    simulatedPixel5
      ? '改址请求已记录，后续进展会继续显示在当前订单会话中。'
      : 'Your address change request was recorded. Updates will stay in this order thread.',
  )
  await expect(page.locator('[data-testid^="food-delivery-event-surface-"]')).toHaveCount(0)

  const simulationAfterRequest = await readPersistedData(page, SIMULATION_STORAGE_KEY)
  expect(simulationAfterRequest.eventInstancesV2[0]).toMatchObject({
    lifecycle: 'active',
    currentNodeId: 'rider_response_timeout',
    decisionLedger: [{ key: 'rider_response_disposition', outcome: 'no_response' }],
  })
  await expectNoHorizontalOverflow(page, 'food-delivery-order-chain')
  await captureEvidence(page, testInfo, 'request-recorded')

  await page.clock.fastForward(61_000)
  await page.getByRole('button', {
    name: simulatedPixel5 ? '刷新订单状态' : 'Refresh order status',
  }).click()
  await expect(orderChain).toContainText(
    simulatedPixel5
      ? '配送员暂未回复，你可以从当前订单拨打配送员电话。'
      : 'The rider has not replied. You can call the rider from this order.',
  )
  const callRider = page.getByTestId('food-delivery-order-call-rider')
  await expect(callRider).toBeVisible()
  await callRider.click()

  const phoneCall = page.getByTestId('phone-food-delivery-call')
  await expect(phoneCall).toBeVisible()
  await expect(page.getByTestId('phone-food-delivery-transcript')).toContainText(
    simulatedPixel5
      ? '你好，我是负责这笔订单的配送员。'
      : 'Hello, this is your delivery rider.',
  )
  await page.getByTestId('phone-food-delivery-input').fill(
    simulatedPixel5
      ? '地址错了，请把订单改送到我选择的新地址。'
      : 'The address is wrong. Please change the delivery to the selected destination.',
  )
  await page.getByTestId('phone-food-delivery-send').click()
  await expect(page.getByTestId('phone-food-delivery-transcript')).toContainText(
    simulatedPixel5
      ? '可以，我会改送到新地址。请返回外卖订单查看处理结果。'
      : 'I can update the delivery address. Please return to Food Delivery for confirmation.',
  )
  await expect(page.getByTestId('phone-food-delivery-proposal')).toContainText(
    simulatedPixel5 ? '配送员已同意改址' : 'The rider agreed to the address change',
  )
  await page.clock.resume()
  await expectNoHorizontalOverflow(page, 'phone-food-delivery-call')
  const phoneAccessibility = await expectNoCriticalAxeViolations(
    page,
    '[data-testid="phone-food-delivery-call"]',
  )
  await testInfo.attach(`phone-accessibility-${testInfo.project.name}.json`, {
    body: Buffer.from(JSON.stringify(phoneAccessibility.violations, null, 2)),
    contentType: 'application/json',
  })
  await captureEvidence(page, testInfo, 'phone-resolution')

  await page.getByTestId('phone-food-delivery-hangup').click()
  await expect(page).toHaveURL(new RegExp(`/food-delivery\\?orderId=${order.id}.*conversation=1`))
  await expect(orderChain).toBeVisible()
  await expect(orderChain).toContainText(alternateAnchor.label.split(' / ')[0])
  await expect(orderChain).toContainText(
    /Map updated the route|Map 已更新路线/,
  )

  await expect
    .poll(async () => {
      const food = await readPersistedData(page, FOOD_DELIVERY_STORAGE_KEY)
      const map = await readPersistedData(page, MAP_STORAGE_KEY)
      const simulation = await readPersistedData(page, SIMULATION_STORAGE_KEY)
      const phone = await readPersistedData(page, PHONE_STORAGE_KEY)
      const currentOrder = food.orders.find((item) => item.id === order.id)
      const currentJourney = map.deliveryJourneys.find(
        (item) => item.id === currentOrder.deliveryJourneyId,
      )
      return {
        order: {
          deliveryAddress: currentOrder.deliveryAddress,
          addressRevision: currentOrder.addressRevision,
          estimateRevision: currentOrder.mapEstimateRef?.journeyRevision,
        },
        serviceCase: food.serviceCases[0],
        journey: {
          destinationId: currentJourney.destination.id,
          routeRevision: currentJourney.routeRevision,
        },
        instance: simulation.eventInstancesV2[0],
        phoneResolution: phone.interactionResolutions[0],
      }
    })
    .toMatchObject({
      order: {
        deliveryAddress: expect.any(String),
        addressRevision: 2,
        estimateRevision: 2,
      },
      serviceCase: { status: 'resolved', resolutionCode: 'changed_after_pickup' },
      journey: { destinationId: alternateAnchor.value, routeRevision: 2 },
      instance: { lifecycle: 'resolved', resultCodes: ['changed_after_pickup'] },
      phoneResolution: { status: 'proposed', outcomeCode: 'accepted_new_destination' },
    })

  await expectNoHorizontalOverflow(page, 'food-delivery-order-chain')
  const orderAccessibility = await expectNoCriticalAxeViolations(
    page,
    '[data-testid="food-delivery-order-chain"]',
  )
  await testInfo.attach(`order-accessibility-${testInfo.project.name}.json`, {
    body: Buffer.from(JSON.stringify(orderAccessibility.violations, null, 2)),
    contentType: 'application/json',
  })
  await captureEvidence(page, testInfo, 'rerouted-order')
  expect(pageErrors).toEqual([])
})
