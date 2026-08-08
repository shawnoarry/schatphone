import { expect, test } from '@playwright/test'
import { navigateInsideUnlockedApp, unlockToHome } from './helpers/navigation.js'

const STORAGE_KEYS = Object.freeze({
  calendar: 'schatphone:store:calendar',
  chat: 'schatphone:store:chat',
  relationship: 'schatphone:store:relationship-runtime',
  reminders: 'schatphone:store:reminders',
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

test('Shopping gift order reaches Chat, Calendar, Wallet, and one relationship memory', async ({
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

  const shoppingCue = await pollPersistedData(page, STORAGE_KEYS.reminders, (snapshot) =>
    snapshot?.shoppingDeliveryCues?.find((cue) => cue.orderId === orderId),
  )
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
  })

  const relationshipMemoryKey = `shopping_gift__${orderId}`
  const relationshipEvents = await pollPersistedData(
    page,
    STORAGE_KEYS.relationship,
    (snapshot) => {
      const events =
        snapshot?.events?.filter((event) => event.memoryKey === relationshipMemoryKey) || []
      return events.length === 2 ? events : null
    },
  )
  expect(relationshipEvents.map((event) => event.sourceModule).sort()).toEqual([
    'relationship_shopping_gift',
    'relationship_wallet_order_support',
  ])
  expect(
    relationshipEvents.find((event) => event.sourceModule === 'relationship_wallet_order_support')
      ?.metricDeltas,
  ).toEqual({})

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
  const memoryRow = page.getByTestId(`contacts-memory-open-${relationshipMemoryKey}`)
  await expect(memoryRow).toContainText('Gift purchased for Eva')
  await expect(memoryRow).toContainText('2 item(s)')
  await memoryRow.click()
  await expect(page.getByTestId('contacts-memory-source-relationship_shopping_gift')).toBeVisible()
  await expect(
    page.getByTestId('contacts-memory-source-relationship_wallet_order_support'),
  ).toBeVisible()

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
  ).toHaveLength(2)
  expect(pageErrors).toEqual([])
})
