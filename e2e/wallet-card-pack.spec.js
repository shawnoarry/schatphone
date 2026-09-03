import { expect, test } from '@playwright/test'
import { navigateInsideUnlockedApp, unlockToHome } from './helpers/navigation.js'

const DEFAULT_APPEARANCE_BY_CARD_ID = Object.freeze([
  ['wallet_card_icbc_cny', 'icbc_peony_standard'],
  ['wallet_card_kb_krw', 'kb_seoul_standard'],
  ['wallet_card_chase_usd', 'chase_usd_standard'],
  ['wallet_card_bnp_eur', 'bnp_euro_standard'],
  ['wallet_card_mufg_jpy', 'mufg_jpy_standard'],
  ['wallet_card_hsbc_hkd', 'hsbc_hkd_standard'],
  ['wallet_card_hana_global_credit', 'hana_global_standard'],
  ['wallet_card_amex_usd_global_credit', 'amex_world_passage'],
])

const COMPLETE_DEFAULT_CARD_IDS = new Set(
  DEFAULT_APPEARANCE_BY_CARD_ID.slice(0, 7).map(([cardId]) => cardId),
)

const readCardArtwork = (locator) =>
  locator.evaluate((element) => element.style.getPropertyValue('--card-artwork').trim())

const readCompleteCardArtwork = (locator) =>
  locator.evaluate((element) => element.style.getPropertyValue('--complete-artwork').trim())

const expectNoPageOverflow = async (page) => {
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1,
      ),
    )
    .toBe(true)
}

const seedVerifiedPayee = async (page) => {
  await page.addInitScript(() => {
    const now = Date.now()
    window.localStorage.setItem(
      'schatphone:store:wallet',
      JSON.stringify({
        version: 1,
        savedAt: now,
        data: {
          knownPayeeAccounts: [
            {
              id: 'role_payee_1_icbc_cny',
              payeeAccountId: 'role_payee_1_icbc_cny',
              ownerProfileId: 1,
              ownerRoleId: 'eva',
              ownerContactId: 1,
              ownerName: 'Eva',
              institutionId: 'icbc',
              currency: 'CNY',
              accountNumberLast4: '4421',
              status: 'active',
              sourceChatId: 1,
              sourceMessageId: 'chat_payee_share_eva_e2e',
              disclosedAt: now - 60_000,
              updatedAt: now - 60_000,
            },
          ],
          transactions: [
            {
              id: 'wallet_seed_transfer_1',
              type: 'income',
              title: '启动资金',
              counterparty: 'SchatPhone',
              amount: '1288.00',
              currency: 'CNY',
              accountId: 'wallet_account_icbc_cny',
              sourceModule: 'seed',
              createdAt: now - 120_000,
              updatedAt: now - 120_000,
            },
          ],
        },
      }),
    )
  })
}

const seedSourceActivity = async (page) => {
  await page.addInitScript(() => {
    const now = Date.now()
    window.localStorage.setItem(
      'schatphone:store:wallet',
      JSON.stringify({
        version: 1,
        savedAt: now,
        data: {
          transactions: [
            {
              id: 'wallet_source_shopping',
              type: 'expense',
              title: '服饰订单',
              counterparty: '29CM',
              amount: '88.00',
              currency: 'CNY',
              accountId: 'wallet_account_icbc_cny',
              sourceModule: 'shopping_wallet_expense',
              sourceId: 'shopping-order-source-1',
              createdAt: now - 60_000,
              updatedAt: now - 60_000,
            },
            {
              id: 'wallet_source_food',
              type: 'expense',
              title: '咖啡订单',
              counterparty: 'Harbor Roast',
              amount: '36.00',
              currency: 'CNY',
              accountId: 'wallet_account_icbc_cny',
              sourceModule: 'food_delivery_wallet_expense',
              sourceId: 'food-order-source-1',
              createdAt: now - 120_000,
              updatedAt: now - 120_000,
            },
            {
              id: 'wallet_source_chat',
              type: 'income',
              title: '共同开销',
              counterparty: 'Eva',
              amount: '25.00',
              currency: 'CNY',
              accountId: 'wallet_account_icbc_cny',
              sourceModule: 'chat_transfer',
              sourceId: 'chat-transfer-source-1',
              createdAt: now - 180_000,
              updatedAt: now - 180_000,
            },
          ],
        },
      }),
    )
  })
}

const seedSystemTheme = async (page, currentTheme) => {
  await page.addInitScript((theme) => {
    const now = Date.now()
    window.localStorage.setItem(
      'schatphone:store:system',
      JSON.stringify({
        version: 1,
        savedAt: now,
        data: {
          settings: {
            appearance: {
              currentTheme: theme,
              wallpaperMode: 'theme',
            },
          },
        },
      }),
    )
  }, currentTheme)
}

test('Wallet provides a persistent multi-bank card pack and account-scoped money flows', async ({
  page,
}, testInfo) => {
  const pageErrors = []
  const consoleErrors = []
  page.on('pageerror', (error) => pageErrors.push(error.message))
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text())
  })

  await seedVerifiedPayee(page)
  await unlockToHome(page)
  await navigateInsideUnlockedApp(page, '/wallet?homePage=0&from=home')

  const cardDeck = page.getByTestId('wallet-card-deck')
  const paymentCards = cardDeck.locator('[data-testid^="wallet-payment-card-"]')
  await expect(cardDeck).toBeVisible()
  await expect(paymentCards).toHaveCount(8)
  await expect
    .poll(() => cardDeck.evaluate((element) => element.scrollWidth <= element.clientWidth + 1))
    .toBe(true)

  const [firstCardBox, secondCardBox, activeCardBox] = await Promise.all([
    paymentCards.nth(0).boundingBox(),
    paymentCards.nth(1).boundingBox(),
    paymentCards.last().boundingBox(),
  ])
  expect(firstCardBox).not.toBeNull()
  expect(secondCardBox).not.toBeNull()
  expect(activeCardBox).not.toBeNull()
  expect(secondCardBox.y).toBeGreaterThan(firstCardBox.y)
  expect(secondCardBox.y).toBeLessThan(firstCardBox.y + firstCardBox.height)
  expect(activeCardBox.y + activeCardBox.height).toBeGreaterThan(
    secondCardBox.y + secondCardBox.height,
  )

  const cnyCard = page.getByTestId('wallet-payment-card-wallet_card_icbc_cny')
  const eurCard = page.getByTestId('wallet-payment-card-wallet_card_bnp_eur')
  const usdCard = page.getByTestId('wallet-payment-card-wallet_card_chase_usd')
  const creditCard = page.getByTestId('wallet-payment-card-wallet_card_hana_global_credit')

  await expect(
    page.getByTestId('wallet-card-account-summary-wallet_card_icbc_cny-home'),
  ).toContainText('1288.00 CNY')
  await eurCard.scrollIntoViewIfNeeded()
  await expect(eurCard).toHaveAttribute('aria-label', /0\.00 EUR/)
  await creditCard.scrollIntoViewIfNeeded()
  await expect(creditCard).toHaveAttribute('aria-label', /Global One.*KRW\s*15,000,000/)
  const selectedCards = cardDeck.locator(
    '[data-testid^="wallet-payment-card-"][aria-pressed="true"]',
  )
  await expect(selectedCards).toHaveCount(1)
  await expect(paymentCards.last()).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('#wallet-cards-heading')).toHaveText(/\S/)

  await creditCard.click({ position: { x: 24, y: 20 } })
  await expect(creditCard).toHaveAttribute('aria-pressed', 'true')
  await expect(
    page.getByTestId('wallet-card-account-summary-wallet_card_hana_global_credit-home'),
  ).toContainText(/Global One/)
  await expect(
    page.getByTestId('wallet-card-account-summary-wallet_card_hana_global_credit-home'),
  ).toContainText(/KRW\s*15,000,000/)
  await expect(paymentCards.last()).toHaveAttribute(
    'data-testid',
    'wallet-payment-card-wallet_card_hana_global_credit',
  )
  await expect(page.getByRole('heading', { name: /韩亚银行|Hana Bank/ })).toBeVisible()
  await expectNoPageOverflow(page)

  await testInfo.attach(`wallet-card-pack-${testInfo.project.name}`, {
    body: await page.screenshot(),
    contentType: 'image/png',
  })

  await page.getByTestId('wallet-open-active-card').click()
  await expect(page.getByRole('heading', { name: /支持币种|Supported currencies/ })).toBeVisible()
  const supportedCurrencies = page.getByTestId('wallet-supported-currencies')
  await expect(supportedCurrencies.getByRole('listitem')).toHaveCount(6)
  for (const currency of ['KRW', 'CNY', 'USD', 'EUR', 'JPY', 'HKD']) {
    await expect(supportedCurrencies.getByText(currency, { exact: true })).toBeVisible()
  }

  await page.getByTestId('wallet-header-back').click()
  await usdCard.scrollIntoViewIfNeeded()
  await usdCard.click({ position: { x: 24, y: 20 } })
  await page.getByTestId('wallet-open-active-card').click()
  await page.getByTestId('wallet-set-default-card').click()
  await expect(page.getByRole('status')).toContainText(
    /默认支付卡已更新|Default payment card updated/,
  )
  await expect(page.getByTestId('wallet-set-default-card')).toHaveCount(0)

  await page.getByTestId('wallet-toggle-card-frozen').click()
  await expect(page.getByRole('status')).toContainText(/卡片已冻结|Card frozen/)
  await expect(
    page.getByTestId('wallet-card-account-summary-wallet_card_chase_usd-detail'),
  ).toContainText(/已冻结|Frozen/)
  await page.getByTestId('wallet-toggle-card-frozen').click()
  await expect(page.getByRole('status')).toContainText(/卡片已解冻|Card unfrozen/)

  await page.getByTestId('wallet-header-back').click()
  await page.getByTestId('wallet-open-settings').click()
  await page.getByTestId('wallet-primary-currency').selectOption('EUR')
  await page.getByTestId('wallet-save-primary-currency').click()
  await expect(page.getByRole('status')).toContainText(/显示币种已更新|Display currency updated/)

  await page.getByTestId('wallet-toggle-rate-settings').click()
  await expect(page.getByTestId('wallet-toggle-rate-settings')).toHaveAttribute(
    'aria-expanded',
    'true',
  )
  await page.getByTestId('wallet-usd-cny-rate').fill('7.35')
  await page.getByTestId('wallet-save-usd-cny-rate').click()
  await expect(page.getByRole('status')).toContainText(
    /USD\/CNY 参考汇率已更新|USD\/CNY reference rate updated/,
  )
  await expect(page.getByTestId('wallet-usd-cny-rate')).toHaveValue('7.3500')

  const jpyRateRow = page.getByTestId('wallet-rate-row-JPY')
  await jpyRateRow.scrollIntoViewIfNeeded()
  await page.getByTestId('wallet-cny-rate-JPY').fill('0.05')
  await page.getByTestId('wallet-save-cny-rate-JPY').click()
  await expect(page.getByTestId('wallet-cny-rate-JPY')).toHaveValue('0.0500')
  await expectNoPageOverflow(page)

  const rateRowBox = await jpyRateRow.boundingBox()
  const viewport = page.viewportSize()
  expect(rateRowBox).not.toBeNull()
  expect(viewport).not.toBeNull()
  expect(rateRowBox.x).toBeGreaterThanOrEqual(0)
  expect(rateRowBox.x + rateRowBox.width).toBeLessThanOrEqual(viewport.width + 1)

  await testInfo.attach(`wallet-rate-settings-${testInfo.project.name}`, {
    body: await page.screenshot({ fullPage: true }),
    contentType: 'image/png',
  })

  await page.getByTestId('wallet-header-back').click()
  await cnyCard.scrollIntoViewIfNeeded()
  await cnyCard.click({ position: { x: 24, y: 20 } })
  await expect(
    page.getByTestId('wallet-card-account-summary-wallet_card_icbc_cny-home'),
  ).toContainText('1288.00 CNY')
  await eurCard.scrollIntoViewIfNeeded()
  await expect(eurCard).toHaveAttribute('aria-label', /0\.00 EUR/)

  await cnyCard.scrollIntoViewIfNeeded()
  await cnyCard.click({ position: { x: 24, y: 20 } })
  await page.getByTestId('wallet-open-transfer').click()
  await expect(page.getByTestId('wallet-transfer-account')).toHaveValue('wallet_account_icbc_cny')
  await page.getByTestId('wallet-transfer-counterparty').fill('练习室租金')
  await page.getByTestId('wallet-transfer-amount').fill('88')
  await page.getByTestId('wallet-submit-transfer').click()
  await expect(page.getByRole('status')).toContainText(/转账已完成|Transfer complete/)
  await expect(page.getByText('-88.00 CNY', { exact: true })).toBeVisible()

  await page.getByTestId('wallet-header-back').click()
  await page.getByTestId('wallet-open-receive').click()
  await page.getByTestId('wallet-receive-account').selectOption('wallet_account_bnp_eur')
  await expect(page.getByTestId('wallet-payment-card-wallet_card_bnp_eur')).toHaveAttribute(
    'aria-label',
    /法国巴黎银行|BNP Paribas/,
  )
  await page.getByTestId('wallet-use-receive-card').click()
  await expect(page.getByTestId('wallet-payment-card-wallet_card_bnp_eur')).toHaveAttribute(
    'aria-pressed',
    'true',
  )

  await page.getByTestId('wallet-open-transfer').click()
  await page.getByTestId('wallet-transfer-incoming').click()
  await expect(page.getByTestId('wallet-transfer-account')).toHaveValue('wallet_account_bnp_eur')
  await page.getByTestId('wallet-transfer-counterparty').fill('海外演出结算')
  await page.getByTestId('wallet-transfer-amount').fill('12')
  await page.getByTestId('wallet-submit-transfer').click()
  await expect(page.getByRole('status')).toContainText(/收款已记入账户|Payment received/)
  await expect(page.getByText('+12.00 EUR', { exact: true })).toBeVisible()

  await page.getByTestId('wallet-nav-activity').click()
  await page.getByTestId('wallet-activity-search').fill('海外演出结算')
  await expect(page.getByTestId('wallet-activity-result-count')).toContainText('1')
  const searchedActivity = page.getByRole('listitem').filter({ hasText: '海外演出结算' })
  await expect(searchedActivity).toContainText('+12.00 EUR')
  await expectNoPageOverflow(page)

  await testInfo.attach(`wallet-activity-search-${testInfo.project.name}`, {
    body: await page.screenshot({ fullPage: true }),
    contentType: 'image/png',
  })

  await page.getByTestId('wallet-activity-search-clear').click()
  await expect(page.getByTestId('wallet-activity-search')).toHaveValue('')

  await page.getByTestId('wallet-open-monthly-statement').click()
  await expect(page.getByTestId('wallet-monthly-statement')).toBeVisible()
  await expect(page.getByTestId('wallet-statement-total-CNY')).toContainText('+1288.00')
  await expect(page.getByTestId('wallet-statement-total-CNY')).toContainText('-88.00')
  await expect(page.getByTestId('wallet-statement-total-CNY')).toContainText('+1200.00')
  await expect(page.getByTestId('wallet-statement-total-EUR')).toContainText('+12.00')
  await expect(page.getByTestId('wallet-statement-total-EUR')).toContainText('0.00')
  await expectNoPageOverflow(page)

  const statementActivity = page
    .getByTestId('wallet-monthly-statement-transactions')
    .getByRole('listitem')
    .filter({ hasText: '海外演出结算' })
  await statementActivity.locator('[data-testid^="wallet-open-statement-transaction-"]').click()
  await expect(page.getByTestId('wallet-transaction-detail')).toContainText('海外演出结算')
  await page.getByTestId('wallet-header-back').click()
  await expect(page.getByTestId('wallet-monthly-statement')).toBeVisible()

  await testInfo.attach(`wallet-monthly-statement-${testInfo.project.name}`, {
    body: await page.screenshot({ fullPage: true }),
    contentType: 'image/png',
  })

  await page.getByTestId('wallet-header-back').click()
  await expect(page.getByTestId('wallet-activity-search')).toBeVisible()

  const walletMain = page.getByRole('main')
  await walletMain.evaluate((element) => element.scrollTo({ top: 999999 }))
  const lastActivity = walletMain.getByRole('list').getByRole('listitem').last()
  const bottomNavigation = page.getByRole('navigation', {
    name: /钱包导航|Wallet navigation/,
  })
  const [activityBox, navigationBox] = await Promise.all([
    lastActivity.boundingBox(),
    bottomNavigation.boundingBox(),
  ])
  expect(activityBox).not.toBeNull()
  expect(navigationBox).not.toBeNull()
  expect(activityBox.y + activityBox.height).toBeLessThanOrEqual(navigationBox.y + 1)
  await expectNoPageOverflow(page)

  await page.getByTestId('wallet-nav-home').click()
  await expect(page.getByTestId('wallet-open-verified-payees')).toContainText(
    /1 个已验证账户|1 verified account/,
  )
  await page.getByTestId('wallet-open-verified-payees').click()
  const payeeRow = page.getByTestId('wallet-payee-role_payee_1_icbc_cny')
  await expect(payeeRow).toContainText('Eva')
  await expect(payeeRow).toContainText(/中国工商银行|ICBC/)
  await expect(payeeRow).toContainText('•••• 4421')
  await expect(payeeRow).toContainText('CNY')
  await expect(payeeRow).toContainText(/已验证|Verified/)
  await expectNoPageOverflow(page)

  await payeeRow.click()
  await expect(page.getByTestId('wallet-payee-transfer-amount')).toHaveValue('')
  await expect(page.getByTestId('wallet-payee-transfer-note')).toHaveValue('')
  await expect(page.getByTestId('wallet-header-back')).toContainText(/收款人|Payees/)
  await page.getByTestId('wallet-header-back').click()
  await expect(page.getByTestId('wallet-verified-payees')).toBeVisible()

  await page.getByTestId('wallet-payee-role_payee_1_icbc_cny').click()
  await page.getByTestId('wallet-payee-transfer-amount').fill('25.50')
  await page.getByTestId('wallet-payee-transfer-note').fill('Dinner repeat')
  await page.getByTestId('wallet-confirm-payee-transfer').click()
  await expect(page.getByTestId('wallet-transfer-receipt')).toContainText('25.50 CNY')
  await expect(page.getByTestId('wallet-receipt-return-chat')).toHaveCount(0)
  await expect(page.getByTestId('wallet-receipt-return-payees')).toBeVisible()

  await testInfo.attach(`wallet-verified-payees-${testInfo.project.name}`, {
    body: await page.screenshot({ fullPage: true }),
    contentType: 'image/png',
  })

  await page.getByTestId('wallet-receipt-return-payees').click()
  await expect(page.getByTestId('wallet-payee-role_payee_1_icbc_cny')).toBeVisible()
  await expectNoPageOverflow(page)

  expect(pageErrors).toEqual([])
  expect(consoleErrors).toEqual([])
})

test('Wallet home presents card customization and source-app activity as a mobile-first overview', async ({
  page,
}, testInfo) => {
  const pageErrors = []
  const consoleErrors = []
  page.on('pageerror', (error) => pageErrors.push(error.message))
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text())
  })

  await seedSourceActivity(page)
  await unlockToHome(page)
  await navigateInsideUnlockedApp(page, '/wallet?homePage=0&from=home')

  await expect(page.getByTestId('wallet-card-deck')).toBeVisible()
  await expect(page.getByTestId('wallet-open-active-card-appearances')).toBeVisible()
  await expect(page.getByRole('heading', { name: /最近账单|Recent activity/ })).toBeVisible()

  const shoppingMark = page.getByTestId('wallet-transaction-source-wallet_source_shopping')
  const foodMark = page.getByTestId('wallet-transaction-source-wallet_source_food')
  const chatMark = page.getByTestId('wallet-transaction-source-wallet_source_chat')
  await expect(shoppingMark).toHaveAttribute('data-source-kind', 'shopping')
  await expect(foodMark).toHaveAttribute('data-source-kind', 'food')
  await expect(chatMark).toHaveAttribute('data-source-kind', 'chat')
  await expect(
    page.getByTestId('wallet-open-home-transaction-wallet_source_shopping'),
  ).toContainText('29CM')
  await expect(page.getByTestId('wallet-open-home-transaction-wallet_source_food')).toContainText(
    'Harbor Roast',
  )
  await expect(page.getByTestId('wallet-open-home-transaction-wallet_source_chat')).toContainText(
    'Eva',
  )
  await expectNoPageOverflow(page)

  await testInfo.attach(`wallet-b-concept-home-${testInfo.project.name}`, {
    body: await page.screenshot({ fullPage: true }),
    contentType: 'image/png',
  })

  await page.getByTestId('wallet-open-home-transaction-wallet_source_shopping').click()
  await expect(page.getByTestId('wallet-transaction-detail')).toContainText('29CM')
  await expect(page.getByTestId('wallet-header-back')).toContainText(/钱包|Wallet/)
  await page.getByTestId('wallet-header-back').click()
  await expect(page.getByTestId('wallet-card-deck')).toBeVisible()

  await page.getByTestId('wallet-open-active-card-appearances').click()
  await expect(page.getByTestId('wallet-card-appearance-collection')).toBeVisible()
  await page.getByTestId('wallet-header-back').click()
  await expect(page.getByTestId('wallet-card-deck')).toBeVisible()

  expect(pageErrors).toEqual([])
  expect(consoleErrors).toEqual([])
})

test('Wallet keeps its fixed mint-ledger identity under the zen system theme', async ({ page }, testInfo) => {
  const pageErrors = []
  const consoleErrors = []
  page.on('pageerror', (error) => pageErrors.push(error.message))
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text())
  })

  await seedSystemTheme(page, 'zen')
  await unlockToHome(page)
  await navigateInsideUnlockedApp(page, '/wallet?homePage=0&from=home')

  await expect(page.locator('.app-shell')).toHaveAttribute('data-theme', 'zen')
  await expect(page.locator('.wallet-app')).not.toHaveClass(/night/)
  const canvas = await page.locator('.wallet-app').evaluate((el) => getComputedStyle(el).getPropertyValue('--wallet-canvas').trim())
  expect(canvas).toBe('#eef4f2')
  await expect(page.getByTestId('wallet-card-deck')).toBeVisible()
  await expect(page.getByTestId('wallet-card-account-summary-wallet_card_icbc_cny-home')).toBeVisible()
  await expectNoPageOverflow(page)

  await testInfo.attach(`wallet-b-concept-home-zen-${testInfo.project.name}`, {
    body: await page.screenshot({ fullPage: true }),
    contentType: 'image/png',
  })

  expect(pageErrors).toEqual([])
  expect(consoleErrors).toEqual([])
})

test('Wallet equips one bank-exclusive appearance and persists it across reload', async ({
  page,
}, testInfo) => {
  const pageErrors = []
  const consoleErrors = []
  page.on('pageerror', (error) => pageErrors.push(error.message))
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text())
  })

  await unlockToHome(page)
  await navigateInsideUnlockedApp(page, '/wallet?homePage=0&from=home')

  const homeArtworkByCardId = new Map()
  for (const [cardId] of DEFAULT_APPEARANCE_BY_CARD_ID) {
    const homeCard = page.getByTestId(`wallet-payment-card-${cardId}`)
    if (COMPLETE_DEFAULT_CARD_IDS.has(cardId)) {
      await expect(homeCard).toHaveAttribute('data-complete-artwork', 'true')
      homeArtworkByCardId.set(cardId, await readCompleteCardArtwork(homeCard))
    } else {
      await expect(homeCard).toHaveAttribute('data-complete-artwork', 'false')
      homeArtworkByCardId.set(cardId, await readCardArtwork(homeCard))
    }
  }

  const bnpCard = page.getByTestId('wallet-payment-card-wallet_card_bnp_eur')
  await bnpCard.scrollIntoViewIfNeeded()
  await bnpCard.click({ position: { x: 24, y: 20 } })
  await page.getByTestId('wallet-open-active-card-appearances').click()

  const collection = page.getByTestId('wallet-card-appearance-collection')
  await expect(collection).toBeVisible()
  await expect(page.locator('[data-testid^="wallet-card-appearance-"]')).toHaveCount(7)
  await expect(page.getByTestId('wallet-appearance-six-slot-grid')).toBeVisible()
  await expect(page.locator('.wallet-appearance-card-picker button')).toHaveCount(8)
  const visibleAppearanceSlots = page.locator(
    '.wallet-appearance-slot:not(.is-layout-placeholder)',
  )
  const firstAppearanceSlotBox = await visibleAppearanceSlots.nth(0).boundingBox()
  const secondAppearanceSlotBox = await visibleAppearanceSlots.nth(1).boundingBox()
  expect(firstAppearanceSlotBox).not.toBeNull()
  expect(secondAppearanceSlotBox).not.toBeNull()
  expect(Math.abs(firstAppearanceSlotBox.y - secondAppearanceSlotBox.y)).toBeLessThan(2)
  expect(secondAppearanceSlotBox.x).toBeGreaterThan(firstAppearanceSlotBox.x)

  for (const [cardId, appearanceId] of DEFAULT_APPEARANCE_BY_CARD_ID) {
    await page.getByTestId(`wallet-appearance-card-${cardId}`).click()
    const currentCard = page.getByTestId(`wallet-payment-card-${cardId}-appearance-current`)
    const catalogCard = page.getByTestId(
      `wallet-payment-card-${cardId}-appearance-${appearanceId}`,
    )
    const usesCompleteArtwork = COMPLETE_DEFAULT_CARD_IDS.has(cardId)
    await expect(currentCard).toHaveAttribute(
      'data-complete-artwork',
      usesCompleteArtwork ? 'true' : 'false',
    )
    await expect(catalogCard).toHaveAttribute(
      'data-complete-artwork',
      usesCompleteArtwork ? 'true' : 'false',
    )
    const readArtwork = usesCompleteArtwork ? readCompleteCardArtwork : readCardArtwork
    expect(await readArtwork(currentCard)).toBe(homeArtworkByCardId.get(cardId))
    expect(await readArtwork(catalogCard)).toBe(homeArtworkByCardId.get(cardId))
    await expect(page.locator('.wallet-appearance-current__state.is-equipped')).toBeVisible()
  }

  await page.getByTestId('wallet-appearance-card-wallet_card_bnp_eur').click()
  await expect(
    page.getByTestId('wallet-payment-card-wallet_card_bnp_eur-appearance-bnp_euro_standard'),
  ).toHaveAttribute('data-complete-artwork', 'true')
  await expect(
    page.getByTestId(
      'wallet-payment-card-wallet_card_bnp_eur-appearance-bnp_little_prince_arcade',
    ),
  ).toHaveAttribute('data-complete-artwork', 'true')

  await page.getByTestId('wallet-appearance-card-wallet_card_kb_krw').click()
  await page.getByTestId('wallet-preview-card-appearance-kb_kakao_city').click()
  const lockedKakaoPreview = page.getByTestId(
    'wallet-payment-card-wallet_card_kb_krw-appearance-current',
  )
  await expect(lockedKakaoPreview).toHaveAttribute('data-presentation', 'collector')
  await expect(lockedKakaoPreview).toHaveAttribute('data-complete-artwork', 'true')
  await expect(page.locator('.wallet-appearance-current__plaque')).toContainText(/待解锁|Locked/)
  await expect(page.getByTestId('wallet-equip-previewed-card-appearance')).toHaveCount(0)

  await page.getByTestId('wallet-appearance-preview-account').click()
  await expect(lockedKakaoPreview).toHaveAttribute('data-presentation', 'account')
  await expect(lockedKakaoPreview).toHaveAttribute('data-complete-artwork', 'true')
  await expect(lockedKakaoPreview.locator('.wallet-bank-card__chip')).toHaveCount(0)
  await expect(
    page.getByTestId('wallet-card-account-summary-wallet_card_kb_krw-appearance-account'),
  ).toContainText('0.00 KRW')
  await expect(page.getByTestId('wallet-equip-previewed-card-appearance')).toHaveCount(0)
  await page.getByTestId('wallet-appearance-preview-collector').click()
  await expect(lockedKakaoPreview).toHaveAttribute('data-complete-artwork', 'true')
  await expect(
    page.getByTestId('wallet-card-account-summary-wallet_card_kb_krw-appearance-account'),
  ).toHaveCount(0)

  await page.getByTestId('wallet-appearance-card-wallet_card_bnp_eur').click()
  await expect(page.getByTestId('wallet-card-appearance-bnp_sealed_01')).toContainText(
    /星辰远航|Celestial Voyage/,
  )
  await expect(page.getByTestId('wallet-card-appearance-bnp_sealed_01')).toContainText(
    /待解锁|Locked/,
  )
  await expect(page.locator('[data-testid^="wallet-equip-card-appearance-"]')).toHaveCount(0)
  await expect(page.getByTestId('wallet-card-appearance-mufg_sealed_01')).toHaveCount(0)
  await page.getByTestId('wallet-appearance-filter-owned').click()
  await expect(page.locator('[data-testid^="wallet-card-appearance-placeholder-"]')).toHaveCount(4)
  await expect(page.getByTestId('wallet-card-appearance-bnp_paris_rain')).toContainText('No. 02')
  await page.getByTestId('wallet-appearance-filter-all').click()
  await expectNoPageOverflow(page)

  await page.getByTestId('wallet-preview-card-appearance-bnp_paris_rain').click()
  await expect(page.locator('.wallet-appearance-current__plaque')).toContainText(
    /正在预览|Previewing/,
  )
  await expect(page.getByTestId('wallet-equip-previewed-card-appearance')).toBeVisible()
  await page.getByTestId('wallet-equip-previewed-card-appearance').click()
  await expect(page.getByRole('status')).toContainText(/卡面已更换|Card appearance updated/)
  await expect(
    page.getByTestId('wallet-payment-card-wallet_card_bnp_eur-appearance-current'),
  ).toHaveAttribute('style', /bnp-paris-rain\.webp/)

  await testInfo.attach(`wallet-card-appearance-collection-${testInfo.project.name}`, {
    body: await page.screenshot({ fullPage: true }),
    contentType: 'image/png',
  })

  await page.reload()
  await unlockToHome(page)
  await navigateInsideUnlockedApp(page, '/wallet?homePage=0&from=home')
  await expect(page.getByTestId('wallet-payment-card-wallet_card_bnp_eur')).toHaveAttribute(
    'style',
    /bnp-paris-rain\.webp/,
  )
  await expectNoPageOverflow(page)
  expect(pageErrors).toEqual([])
  expect(consoleErrors).toEqual([])
})
