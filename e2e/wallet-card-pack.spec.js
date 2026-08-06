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

test('Wallet provides a persistent multi-bank card pack and account-scoped money flows', async ({
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

  const cardCarousel = page.getByTestId('wallet-card-carousel')
  const paymentCards = cardCarousel.locator('[data-testid^="wallet-payment-card-"]')
  await expect(cardCarousel).toBeVisible()
  await expect(paymentCards).toHaveCount(7)
  await expect
    .poll(() =>
      cardCarousel.evaluate((element) => element.scrollWidth > element.clientWidth + 1),
    )
    .toBe(true)

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
  await expect(creditCard).toHaveAttribute('aria-pressed', 'true')
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
  await usdCard.click()
  await page.getByTestId('wallet-open-active-card').click()
  await page.getByTestId('wallet-set-default-card').click()
  await expect(page.getByRole('status')).toContainText(/默认支付卡已更新|Default payment card updated/)
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
  await cnyCard.click()
  await expect(cnyCard).toContainText('1288.00 CNY')
  await eurCard.scrollIntoViewIfNeeded()
  await expect(eurCard).toContainText('0.00 EUR')

  await cnyCard.scrollIntoViewIfNeeded()
  await cnyCard.click()
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

  expect(pageErrors).toEqual([])
  expect(consoleErrors).toEqual([])
})
