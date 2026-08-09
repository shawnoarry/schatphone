import { expect, test } from '@playwright/test'
import {
  navigateInsideUnlockedApp,
  unlockToHome,
  waitForAppRouteReady,
} from './helpers/navigation.js'

const expectNoPageOverflow = async (page) => {
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1,
      ),
    )
    .toBe(true)
}

test('Chat requests a verified role account, Wallet transfers, and the receipt returns to its shared thread', async ({
  page,
}, testInfo) => {
  const pageErrors = []
  const consoleErrors = []
  page.on('pageerror', (error) => pageErrors.push(error.message))
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text())
  })

  await unlockToHome(page)
  await navigateInsideUnlockedApp(page, '/chat/1')

  await page.getByTestId('chat-user-action-toggle').click()
  await page.getByTestId('chat-user-action-open-transfer').click()
  await expect(page.getByTestId('chat-user-action-transfer-currency')).toHaveValue('CNY')
  await page.getByTestId('chat-user-action-transfer-amount').fill('18.80')
  await page.getByTestId('chat-user-action-transfer-note').fill('练习结束后的晚餐')
  await page.getByTestId('chat-user-action-submit-transfer').click()

  const accountCardAction = page.getByTestId(
    'chat-share-card-open-wallet-role_payee_1_icbc_cny',
  )
  await expect(accountCardAction).toBeVisible()
  await expect(accountCardAction).toContainText(/Wallet/)
  await expectNoPageOverflow(page)

  await testInfo.attach(`wallet-role-account-chat-${testInfo.project.name}`, {
    body: await page.screenshot(),
    contentType: 'image/png',
  })

  await accountCardAction.click()
  await waitForAppRouteReady(page, '/wallet')
  await expect(page.getByTestId('wallet-payee-account-summary')).toContainText('Eva')
  await expect(page.getByTestId('wallet-payee-transfer-currency')).toHaveValue('CNY')
  await expect(page.getByTestId('wallet-payee-transfer-amount')).toHaveValue('18.80')
  await expect(page.getByTestId('wallet-payee-transfer-note')).toHaveValue('练习结束后的晚餐')
  await expect(page.getByTestId('wallet-payee-payment-account')).toHaveValue(
    'wallet_account_icbc_cny',
  )
  await expect(page.getByTestId('wallet-confirm-payee-transfer')).toBeEnabled()
  await expectNoPageOverflow(page)

  await testInfo.attach(`wallet-role-transfer-confirm-${testInfo.project.name}`, {
    body: await page.screenshot(),
    contentType: 'image/png',
  })

  await page.getByTestId('wallet-confirm-payee-transfer').click()
  await expect(page.getByTestId('wallet-transfer-receipt')).toContainText('18.80 CNY')
  await expect(page.getByTestId('wallet-receipt-number')).toHaveText(/^SP\d{14}$/)
  await expect(page).toHaveURL(/#\/wallet\?.*receiptId=/)
  await expectNoPageOverflow(page)

  await testInfo.attach(`wallet-role-transfer-receipt-${testInfo.project.name}`, {
    body: await page.screenshot(),
    contentType: 'image/png',
  })

  await page.getByTestId('wallet-receipt-share-chat').click()
  await waitForAppRouteReady(page, '/chat?share=internal')
  await expect(page.getByTestId('chat-internal-share-recipient-picker')).toContainText(
    /转账回执|Transfer receipt/,
  )
  await page.getByTestId('chat-contact-row-2').click()
  await waitForAppRouteReady(page, '/chat/2')
  await page.getByTestId('chat-internal-share-send').click()

  const receiptShareCard = page.locator('[data-testid^="chat-share-card-wallet-wallet_tx_"]').last()
  await expect(receiptShareCard).toContainText('18.80 CNY')
  await expect(receiptShareCard).toContainText(/钱包回执|Wallet receipt/)
  await expectNoPageOverflow(page)

  await receiptShareCard.getByRole('button', { name: /查看回执|View receipt/ }).click()
  await waitForAppRouteReady(page, '/wallet')
  await expect(page).toHaveURL(/source=chat_share/)
  await expect(page).toHaveURL(/returnChatId=2/)
  await expect(page.getByTestId('wallet-transfer-receipt')).toContainText('18.80 CNY')
  await page.getByTestId('wallet-receipt-return-chat').click()
  await waitForAppRouteReady(page, '/chat/2')
  await expect(receiptShareCard).toBeVisible()
  await expectNoPageOverflow(page)

  await navigateInsideUnlockedApp(page, '/wallet')
  await page.getByTestId('wallet-open-activity').click()
  const reopenReceipt = page.locator('[data-testid^="wallet-open-receipt-"]').first()
  await expect(reopenReceipt).toBeVisible()
  await reopenReceipt.click()
  await expect(page.getByTestId('wallet-transfer-receipt')).toContainText('18.80 CNY')
  await expect(page.getByTestId('wallet-receipt-return-chat')).toHaveCount(0)
  await expectNoPageOverflow(page)

  expect(pageErrors).toEqual([])
  expect(consoleErrors).toEqual([])
})
