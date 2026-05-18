import { beforeEach, describe, expect, test, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { WALLET_TRANSACTION_SOURCE_FILTERS, useWalletStore } from '../src/stores/wallet'

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

  test('stores relationship binding on manual transfer records and anonymizes them during cleanup', () => {
    const store = useWalletStore()
    store.resetForTesting()

    const transfer = store.addTransferTransaction({
      amount: '66.00',
      currency: 'CNY',
      counterparty: 'HJ',
      note: 'Dinner with HJ',
      relationshipBinding: {
        profileId: 77,
        contactId: 307,
        kind: 'role',
        name: 'HJ',
        sourceModule: 'chat',
        sourceId: '307',
      },
    })

    expect(transfer?.relationshipBinding).toMatchObject({
      profileId: 77,
      contactId: 307,
      name: 'HJ',
    })

    const cleanup = store.cleanupRelationshipForProfile(
      { id: 77, name: 'HJ' },
      { replacementName: 'Unknown counterparty' },
    )

    expect(cleanup).toMatchObject({
      requestedCount: 1,
      anonymizedCount: 1,
    })
    expect(store.findTransactionById(transfer.id)).toMatchObject({
      counterparty: 'Unknown counterparty',
      note: 'Dinner with Unknown counterparty',
      relationshipBinding: {
        profileId: 0,
        contactId: 0,
      },
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

  test('summarizes and filters manual versus Chat-origin ledger records', () => {
    const store = useWalletStore()
    store.resetForTesting()

    const manual = store.addTransferTransaction({
      amount: '50.00',
      currency: 'CNY',
      counterparty: 'Mika',
    })
    const chat = store.addChatTransferTransaction({
      messageId: 'msg_wallet_source_1',
      amount: '12.00',
      currency: 'CNY',
      counterparty: 'Nova',
    })

    expect(store.transactionSourceSummary).toEqual({
      all: 2,
      manual: 1,
      chat: 1,
      orders: 0,
    })
    expect(store.listTransactionsBySourceFilter(WALLET_TRANSACTION_SOURCE_FILTERS.CHAT)).toEqual([chat])
    expect(store.listTransactionsBySourceFilter(WALLET_TRANSACTION_SOURCE_FILTERS.MANUAL)).toEqual([
      manual,
    ])
    expect(store.listTransactionsBySourceFilter('unknown').map((item) => item.id)).toEqual([
      chat.id,
      manual.id,
    ])
  })

  test('summarizes and filters order-origin expenses separately from manual records', () => {
    const store = useWalletStore()
    store.resetForTesting()

    const manual = store.addTransferTransaction({
      amount: '20.00',
      currency: 'CNY',
      counterparty: 'Manual',
    })
    const shopping = store.addTransaction({
      type: 'expense',
      title: 'Shopping order',
      amount: '88.00',
      currency: 'CNY',
      counterparty: 'Shopping',
      sourceModule: 'shopping_wallet_expense',
      sourceId: 'shopping_order_wallet_1',
    })
    const food = store.addTransaction({
      type: 'expense',
      title: 'Food Delivery order',
      amount: '32.00',
      currency: 'CNY',
      counterparty: 'Food Delivery',
      sourceModule: 'food_delivery_wallet_expense',
      sourceId: 'food_order_wallet_1',
    })

    expect(store.transactionSourceSummary).toEqual({
      all: 3,
      manual: 1,
      chat: 0,
      orders: 2,
    })
    expect(store.listTransactionsBySourceFilter(WALLET_TRANSACTION_SOURCE_FILTERS.ORDERS)).toEqual([
      food,
      shopping,
    ])
    expect(store.listTransactionsBySourceFilter(WALLET_TRANSACTION_SOURCE_FILTERS.MANUAL)).toEqual([
      manual,
    ])

    const summary = store.summarizeCounterpartyLedger('Shopping')
    expect(summary).toMatchObject({
      count: 1,
      chatCount: 0,
      orderCount: 1,
      manualCount: 0,
    })
  })

  test('summarizes counterparty ledger context for Contacts', () => {
    const store = useWalletStore()
    store.resetForTesting()

    store.addTransferTransaction({
      amount: '50.00',
      currency: 'CNY',
      counterparty: 'Nova',
      note: 'Manual top-up',
    })
    store.addChatTransferTransaction({
      messageId: 'msg_wallet_contacts_1',
      amount: '12.00',
      currency: 'CNY',
      counterparty: 'nova',
      note: 'Chat coffee',
    })
    store.addTransferTransaction({
      amount: '7.00',
      currency: 'USD',
      counterparty: 'Mika',
    })

    const summary = store.summarizeCounterpartyLedger('NOVA')

    expect(summary).toMatchObject({
      counterparty: 'nova',
      count: 2,
      chatCount: 1,
      orderCount: 0,
      manualCount: 1,
    })
    expect(summary.currencies).toEqual([
      {
        currency: 'CNY',
        amountCents: 3800,
        amount: '38.00',
      },
    ])
    expect(summary.latestTransaction?.sourceModule).toBe('chat_transfer')
    expect(store.listTransactionsByCounterparty('nova').length).toBe(2)
    expect(store.summarizeCounterpartyLedger('Unknown').count).toBe(0)
    expect(store.summarizeCounterpartyLedger('Unknown').orderCount).toBe(0)
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
