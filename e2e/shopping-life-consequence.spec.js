import { expect, test } from '@playwright/test'
import { navigateInsideUnlockedApp, unlockToHome } from './helpers/navigation.js'

const STORAGE_KEYS = Object.freeze({
  calendar: 'schatphone:store:calendar',
  chat: 'schatphone:store:chat',
  relationship: 'schatphone:store:relationship-runtime',
  reminders: 'schatphone:store:reminders',
  phone: 'schatphone:store:phone',
  shopping: 'schatphone:store:shopping',
  wallet: 'schatphone:store:wallet',
})

const readPersistedData = async (page, storageKey) =>
  page.evaluate((key) => {
    const raw = window.localStorage.getItem(key)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return parsed?.data || parsed
  }, storageKey)

const pollPersistedData = async (page, storageKey, resolveValue) => {
  let resolved = null
  await expect
    .poll(async () => {
      const snapshot = await readPersistedData(page, storageKey)
      resolved = resolveValue(snapshot)
      return Boolean(resolved)
    })
    .toBe(true)
  return resolved
}

const expectNoHorizontalOverflow = async (page) => {
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1,
      ),
    )
    .toBe(true)
}

test('one Shopping gift reaches delivery and Phone feedback as one relationship memory', async ({
  page,
}, testInfo) => {
  const pageErrors = []
  page.on('pageerror', (error) => pageErrors.push(error.message))

  await page.addInitScript(() => {
    window.localStorage.setItem(
      'schatphone:store:system',
      JSON.stringify({
        version: 1,
        savedAt: Date.now(),
        data: {
          settings: {
            system: {
              language: 'en-US',
            },
          },
        },
      }),
    )
  })

  await unlockToHome(page)

  await navigateInsideUnlockedApp(page, '/wallet')
  await page.getByTestId('wallet-open-settings').click()
  await page.getByTestId('wallet-primary-currency').selectOption('USD')
  await page.getByTestId('wallet-save-primary-currency').click()
  await expect(page.getByRole('status')).toContainText(/Display currency updated|显示币种已更新/)

  await navigateInsideUnlockedApp(page, '/chat-contacts?section=service')
  await page.getByTestId('chat-directory-service-management-header').click()
  await expect(page.getByTestId('chat-directory-service-management')).toBeVisible()
  await page.getByTestId('chat-directory-create-shopping-service-schat_mall').click()
  await expect(page.getByTestId('chat-directory-service-shopping-service')).toHaveValue(
    'schat_mall',
  )
  await page.getByTestId('chat-directory-save-service').click()

  const shoppingServiceContact = await pollPersistedData(page, STORAGE_KEYS.chat, (snapshot) =>
    snapshot?.contacts?.find((contact) => contact.shoppingServiceKey === 'schat_mall'),
  )

  await navigateInsideUnlockedApp(page, '/shopping?category=mall')
  await page.getByTestId('shopping-add-cart-shopping_seed_mall_card').click()
  await page.getByTestId('shopping-gift-enabled').check()
  await page.getByTestId('shopping-gift-contact').selectOption('1')
  await page.getByTestId('shopping-checkout').click()

  const orderCard = page.locator('article[data-testid^="shopping-order-"]').first()
  await expect(orderCard).toContainText('Eva')
  await expect(orderCard).toContainText('12.22 USD')
  const orderId = (await orderCard.getAttribute('data-testid')).replace('shopping-order-', '')
  expect(orderId).toBeTruthy()

  const shoppingOrder = await pollPersistedData(page, STORAGE_KEYS.shopping, (snapshot) =>
    snapshot?.orders?.find((order) => order.id === orderId),
  )
  expect(shoppingOrder).toMatchObject({
    id: orderId,
    status: 'placed',
    sharedExperienceId: `gift:${orderId}`,
    giftRecipient: {
      name: 'Eva',
      contactId: 1,
      profileId: 1,
    },
    quoteSnapshot: {
      sourceMoney: { amountMinor: 8800, currency: 'CNY' },
      quotedMoney: { amountMinor: 1222, currency: 'USD' },
      targetCurrency: 'USD',
    },
  })

  await navigateInsideUnlockedApp(page, `/chat/${shoppingServiceContact.id}`)
  await expect(
    page.getByTestId(`chat-service-notification-shopping_order_update-${orderId}`),
  ).toContainText('Order placed')
  const chatNotification = await pollPersistedData(page, STORAGE_KEYS.chat, (snapshot) =>
    Object.values(snapshot?.messagesByConversation || {})
      .flat()
      .flatMap((message) => message.blocks || [])
      .find(
        (block) =>
          block.type === 'service_notification' &&
          block.sourceId === orderId &&
          block.sourceModule === 'shopping_order_update',
      ),
  )
  expect(chatNotification.sharedExperienceId).toBe(shoppingOrder.sharedExperienceId)

  const shoppingCue = await pollPersistedData(page, STORAGE_KEYS.reminders, (snapshot) =>
    snapshot?.shoppingDeliveryCues?.find((cue) => cue.orderId === orderId),
  )
  expect(shoppingCue.sharedExperienceId).toBe(shoppingOrder.sharedExperienceId)
  await navigateInsideUnlockedApp(page, '/reminders')
  const reminderCard = page.getByTestId(`reminder-card-shopping:${shoppingCue.id}`)
  await expect(reminderCard).toContainText('Shopping follow-up')
  await reminderCard.getByRole('button', { name: 'Confirm to Calendar' }).click()
  await expect(reminderCard).toContainText('In Calendar')

  const calendarEvent = await pollPersistedData(page, STORAGE_KEYS.calendar, (snapshot) =>
    snapshot?.events?.find((event) => event.sourceReminderId === shoppingCue.id),
  )
  expect(calendarEvent).toMatchObject({
    source: 'shopping_calendar_delivery',
    sourceReminderId: shoppingCue.id,
    sharedExperienceId: shoppingOrder.sharedExperienceId,
    status: 'confirmed',
  })

  await navigateInsideUnlockedApp(page, '/calendar')
  await expect(page.getByTestId('calendar-confirmed-events')).toContainText('Shopping follow-up')

  await navigateInsideUnlockedApp(page, `/shopping?category=mall&orderId=${orderId}`)
  await expect(page.getByTestId('shopping-order-detail-panel')).toBeVisible()
  await page.getByTestId('shopping-order-detail-complete').click()
  await page.getByTestId('shopping-close-order-detail').click()

  const walletRecordButton = page.getByTestId(`shopping-transfer-wallet-${orderId}`)
  await expect(walletRecordButton).toBeVisible()
  await walletRecordButton.click()
  await expect(walletRecordButton).toBeDisabled()

  const walletTransaction = await pollPersistedData(page, STORAGE_KEYS.wallet, (snapshot) =>
    snapshot?.transactions?.find(
      (transaction) =>
        transaction.sourceModule === 'shopping_wallet_expense' && transaction.sourceId === orderId,
    ),
  )
  expect(walletTransaction).toMatchObject({
    type: 'expense',
    title: 'Shopping order',
    amountCents: 1222,
    currency: 'USD',
    quoteSnapshot: shoppingOrder.quoteSnapshot,
    sourceModule: 'shopping_wallet_expense',
    sourceId: orderId,
    sharedExperienceId: shoppingOrder.sharedExperienceId,
  })

  const relationshipMemoryKey = `shared_experience__${shoppingOrder.sharedExperienceId}`
  const relationshipEventsBeforeFeedback = await pollPersistedData(
    page,
    STORAGE_KEYS.relationship,
    (snapshot) => {
      const events =
        snapshot?.events?.filter((event) => event.memoryKey === relationshipMemoryKey) || []
      return events.length === 3 ? events : null
    },
  )
  expect(relationshipEventsBeforeFeedback.map((event) => event.sourceModule).sort()).toEqual([
    'relationship_shopping_gift',
    'relationship_shopping_gift',
    'relationship_wallet_order_support',
  ])
  expect(
    relationshipEventsBeforeFeedback.find(
      (event) => event.sourceModule === 'relationship_wallet_order_support',
    )
      ?.metricDeltas,
  ).toEqual({})

  await navigateInsideUnlockedApp(page, '/phone')
  await page.getByTestId('phone-open-composer').click()
  await page.getByTestId('phone-relationship-contact').selectOption('1')
  await page.getByTestId('phone-direction-incoming').click()
  await expect(page.getByTestId('phone-gift-experience')).toContainText(/Gift Card|礼品卡/)
  await page.getByTestId('phone-gift-experience').selectOption(shoppingOrder.sharedExperienceId)
  await page.getByTestId('phone-summary').fill('I love it.')
  await page.getByTestId('phone-save-call').click()

  const phoneCall = await pollPersistedData(page, STORAGE_KEYS.phone, (snapshot) =>
    snapshot?.calls?.find(
      (call) => call.sharedExperienceId === shoppingOrder.sharedExperienceId,
    ),
  )
  expect(phoneCall).toMatchObject({
    contactName: 'Eva',
    direction: 'incoming',
    summary: 'I love it.',
    sharedExperienceId: shoppingOrder.sharedExperienceId,
  })

  const relationshipEvents = await pollPersistedData(
    page,
    STORAGE_KEYS.relationship,
    (snapshot) => {
      const events =
        snapshot?.events?.filter((event) => event.memoryKey === relationshipMemoryKey) || []
      return events.length === 4 ? events : null
    },
  )
  expect(relationshipEvents).toHaveLength(4)
  expect(
    relationshipEvents.find((event) => event.factType === 'recipient_feedback_received'),
  ).toMatchObject({
    sourceModule: 'relationship_phone_call',
    sharedExperienceId: shoppingOrder.sharedExperienceId,
    effectApplied: false,
    metricDeltas: {},
  })

  await navigateInsideUnlockedApp(page, '/wallet')
  await page.getByTestId('wallet-nav-activity').click()
  await expect(page.getByText('Shopping order').first()).toBeVisible()

  await page.getByTestId(`wallet-open-transaction-detail-${walletTransaction.id}`).click()
  await expect(page.getByTestId('wallet-transaction-detail')).toContainText('Shopping order')
  await expect(page.getByTestId('wallet-transaction-detail')).toContainText(orderId)
  await expect(page.getByTestId('wallet-transaction-detail-source-money')).toHaveText('88.00 CNY')
  await expect(page.getByTestId('wallet-transaction-detail-quoted-money')).toHaveText('12.22 USD')
  await expect(page.getByTestId('wallet-transaction-detail-rate')).toHaveText(
    `1 CNY = ${walletTransaction.quoteSnapshot.rate} USD`,
  )
  await expect(page.getByTestId('wallet-transaction-detail-rate-set')).toHaveText(
    walletTransaction.quoteSnapshot.rateSetId,
  )
  await expect(page.getByTestId('wallet-transaction-detail-rate-source')).toContainText(
    walletTransaction.quoteSnapshot.rateSource,
  )
  await expect(page.getByTestId('wallet-transaction-detail-quoted-at')).not.toHaveText('')
  await expect(page).toHaveURL(new RegExp(`transactionId=${walletTransaction.id}`))
  await expectNoHorizontalOverflow(page)

  await testInfo.attach(`wallet-transaction-detail-${testInfo.project.name}`, {
    body: await page.screenshot(),
    contentType: 'image/png',
  })

  await page.getByTestId('wallet-transaction-detail-rate-set').scrollIntoViewIfNeeded()
  await testInfo.attach(`wallet-transaction-quote-${testInfo.project.name}`, {
    body: await page.screenshot(),
    contentType: 'image/png',
  })

  await navigateInsideUnlockedApp(page, `/wallet?transactionId=${walletTransaction.id}`)
  await expect(page.getByTestId('wallet-transaction-detail')).toContainText('Shopping order')
  await expect(page.getByTestId('wallet-transaction-detail-rate-set')).toHaveText(
    walletTransaction.quoteSnapshot.rateSetId,
  )
  await page.getByTestId('wallet-header-back').click()
  await expect(page).not.toHaveURL(/transactionId=/)
  await expect(
    page.getByTestId(`wallet-open-transaction-detail-${walletTransaction.id}`),
  ).toBeVisible()

  await navigateInsideUnlockedApp(page, '/contacts')
  await page.getByTestId('contacts-row-1').click()
  await expect(page.getByTestId('contacts-role-detail')).toContainText('Eva')
  await page.getByTestId('contacts-open-memories-sheet').click()
  const memoryRow = page.getByTestId(`contacts-memory-open-${relationshipMemoryKey}`)
  await expect(memoryRow).toContainText('I love it.')
  await expect(memoryRow).toContainText('4 item(s)')
  await memoryRow.click()
  await expect(page.getByTestId('contacts-memory-source-relationship_shopping_gift')).toBeVisible()
  await expect(
    page.getByTestId('contacts-memory-source-relationship_wallet_order_support'),
  ).toBeVisible()
  await expect(page.getByTestId('contacts-memory-source-relationship_phone_call')).toBeVisible()

  await navigateInsideUnlockedApp(page, `/shopping?category=mall&orderId=${orderId}`)
  await page.getByTestId('shopping-close-order-detail').click()
  await expect(page.getByTestId(`shopping-transfer-wallet-${orderId}`)).toBeDisabled()

  const finalWallet = await readPersistedData(page, STORAGE_KEYS.wallet)
  const finalRelationship = await readPersistedData(page, STORAGE_KEYS.relationship)
  expect(
    finalWallet.transactions.filter(
      (transaction) =>
        transaction.sourceModule === 'shopping_wallet_expense' && transaction.sourceId === orderId,
    ),
  ).toHaveLength(1)
  expect(
    finalRelationship.events.filter((event) => event.memoryKey === relationshipMemoryKey),
  ).toHaveLength(4)
  expect(pageErrors).toEqual([])
})
