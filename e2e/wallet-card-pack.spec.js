import { expect, test } from '@playwright/test'
import { navigateInsideUnlockedApp, unlockToHome } from './helpers/navigation.js'

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
  await expect(paymentCards).toHaveCount(7)
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

  await expect(cnyCard).toContainText('1288.00 CNY')
  await eurCard.scrollIntoViewIfNeeded()
  await expect(eurCard).toContainText('0.00 EUR')
  await creditCard.scrollIntoViewIfNeeded()
  await expect(creditCard).toContainText(/Global One/)
  await expect(creditCard).toContainText(/KRW\s*15,000,000/)
  const selectedCards = cardDeck.locator(
    '[data-testid^="wallet-payment-card-"][aria-pressed="true"]',
  )
  await expect(selectedCards).toHaveCount(1)
  await expect(paymentCards.last()).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('#wallet-cards-heading')).toHaveText(/\S/)

  await creditCard.click({ position: { x: 24, y: 20 } })
  await expect(creditCard).toHaveAttribute('aria-pressed', 'true')
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
  await expect(page.getByTestId('wallet-payment-card-wallet_card_chase_usd')).toContainText(
    /已冻结|Frozen/,
  )
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
  await expect(cnyCard).toContainText('1288.00 CNY')
  await eurCard.scrollIntoViewIfNeeded()
  await expect(eurCard).toContainText('0.00 EUR')

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
  await expect(page.getByTestId('wallet-payment-card-wallet_card_bnp_eur')).toContainText(
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
  await statementActivity
    .getByRole('button', { name: /查看交易详情|View transaction details/ })
    .click()
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

test('Wallet equips one card-bound appearance and keeps sealed slots intentional', async ({
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

  const bnpCard = page.getByTestId('wallet-payment-card-wallet_card_bnp_eur')
  await bnpCard.scrollIntoViewIfNeeded()
  await bnpCard.click({ position: { x: 24, y: 20 } })
  await page.getByTestId('wallet-open-active-card').click()
  await page.getByTestId('wallet-open-card-appearances').click()

  const collection = page.getByTestId('wallet-card-appearance-collection')
  await expect(collection).toBeVisible()
  await expect(page.locator('[data-testid^="wallet-card-appearance-"]')).toHaveCount(4)
  await expect(page.getByTestId('wallet-card-appearance-bnp_sealed_01')).toContainText(
    /尚未揭晓|Not revealed/,
  )
  await expect(page.getByTestId('wallet-equip-card-appearance-bnp_sealed_01')).toHaveCount(0)
  await expectNoPageOverflow(page)

  await page.getByTestId('wallet-equip-card-appearance-bnp_paris_rain').click()
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
