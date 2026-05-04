import { beforeEach, describe, expect, test, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useWalletStore } from '../src/stores/wallet'

describe('wallet store', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'))
    setActivePinia(createPinia())
  })

  test('seeds a local balance baseline and records transfer transactions', () => {
    const store = useWalletStore()

    expect(store.transactionCount).toBeGreaterThan(0)
    store.resetForTesting()

    const transfer = store.addTransferTransaction({
      amount: '88.50',
      currency: 'usd',
      counterparty: 'Nova',
      note: 'Dinner',
    })

    expect(transfer).toMatchObject({
      type: 'transfer',
      title: '聊天转账',
      amountCents: 8850,
      currency: 'USD',
      counterparty: 'Nova',
      note: 'Dinner',
      sourceModule: 'wallet_manual',
    })
    expect(store.balances).toEqual([
      {
        currency: 'USD',
        amountCents: 8850,
        amount: '88.50',
      },
    ])
  })

  test('rejects invalid amounts and supports expense balance math', () => {
    const store = useWalletStore()
    store.resetForTesting()

    expect(store.addTransferTransaction({ amount: 'abc' })).toBeNull()
    store.addTransaction({
      type: 'income',
      title: 'Reward',
      amount: '100.00',
      currency: 'CNY',
    })
    store.addTransaction({
      type: 'expense',
      title: 'Snack',
      amount: '12.30',
      currency: 'CNY',
    })

    expect(store.primaryBalance).toEqual({
      currency: 'CNY',
      amountCents: 8770,
      amount: '87.70',
    })
  })

  test('records Chat transfer cards as deduped ledger expenses', () => {
    const store = useWalletStore()
    store.resetForTesting()

    const first = store.addChatTransferTransaction({
      messageId: 'msg_transfer_1',
      amount: '18.80',
      currency: 'cny',
      counterparty: 'Nova',
      note: 'Coffee',
      createdAt: Date.now(),
    })
    const second = store.addChatTransferTransaction({
      messageId: 'msg_transfer_1',
      amount: '18.80',
      currency: 'cny',
      counterparty: 'Nova',
      note: 'Coffee duplicate',
      createdAt: Date.now(),
    })

    expect(first).toMatchObject({
      type: 'expense',
      title: 'Chat transfer',
      amountCents: 1880,
      currency: 'CNY',
      counterparty: 'Nova',
      note: 'Coffee',
      sourceModule: 'chat_transfer',
      sourceId: 'msg_transfer_1',
    })
    expect(second.id).toBe(first.id)
    expect(store.transactionCount).toBe(1)
    expect(store.findTransactionBySource('chat_transfer', 'msg_transfer_1')?.id).toBe(first.id)
    expect(store.primaryBalance.amountCents).toBe(-1880)
  })

  test('rejects Chat ledger records without message source', () => {
    const store = useWalletStore()
    store.resetForTesting()

    expect(store.addChatTransferTransaction({ amount: '10.00' })).toBeNull()
    expect(store.transactionCount).toBe(0)
  })

  test('persists, restores, and removes transactions', () => {
    const store = useWalletStore()
    store.resetForTesting()
    const transfer = store.addTransferTransaction({
      amount: '42',
      currency: 'CNY',
      counterparty: 'Mika',
    })
    store.saveNow()

    setActivePinia(createPinia())
    const restoredStore = useWalletStore()

    expect(restoredStore.findTransactionById(transfer.id)?.counterparty).toBe('Mika')
    expect(restoredStore.removeTransaction(transfer.id)).toBe(true)
    expect(restoredStore.findTransactionById(transfer.id)).toBeNull()

    const snapshot = {
      wallet: {
        transactions: [
          {
            id: 'wallet_backup_1',
            type: 'income',
            title: 'Backup',
            amount: '10.00',
            currency: 'CNY',
          },
        ],
      },
    }
    expect(restoredStore.restoreFromBackup(snapshot)).toBe(true)
    expect(restoredStore.transactionCount).toBe(1)
    expect(restoredStore.findTransactionById('wallet_backup_1')?.amountCents).toBe(1000)
  })
})
