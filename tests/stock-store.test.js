import { beforeEach, describe, expect, test, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useStockStore } from '../src/stores/stock'

describe('stock store', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'))
    setActivePinia(createPinia())
  })

  test('seeds simulated market items and upserts holdings', () => {
    const store = useStockStore()

    expect(store.watchlistCount).toBeGreaterThan(0)
    store.resetForTesting()

    const item = store.upsertStock({
      symbol: 'nova',
      name: 'Nova Labs',
      price: '12.34',
      changePercent: '2.5',
      quantity: '10',
      note: 'Role economy sample',
    })

    expect(item).toMatchObject({
      symbol: 'NOVA',
      name: 'Nova Labs',
      priceCents: 1234,
      changePercent: 2.5,
      quantity: 10,
      note: 'Role economy sample',
    })
    expect(store.holdingCount).toBe(1)
    expect(store.primaryHoldingValue).toEqual({
      currency: 'CNY',
      amountCents: 12340,
      amount: '123.40',
    })
  })

  test('rejects invalid assets, dedupes symbols, and updates prices', () => {
    const store = useStockStore()
    store.resetForTesting()

    expect(store.upsertStock({ symbol: '', name: 'Broken', price: 1 })).toBeNull()
    expect(store.upsertStock({ symbol: 'BAD', name: 'Broken', price: 0 })).toBeNull()

    const first = store.upsertStock({
      symbol: 'MIRA',
      name: 'Mira Memory',
      price: 20,
      quantity: 1,
    })
    const second = store.upsertStock({
      symbol: 'mira',
      name: 'Mira Updated',
      price: 30,
      quantity: 2,
    })

    expect(second.id).toBe(first.id)
    expect(store.watchlistCount).toBe(1)
    expect(store.findStockBySymbol('MIRA')?.name).toBe('Mira Updated')

    expect(store.updatePrice('MIRA', { price: 31.5, changePercent: -3.25 })?.priceCents).toBe(3150)
    expect(store.findStockBySymbol('MIRA')?.changePercent).toBe(-3.25)
  })

  test('persists, restores, and removes simulated assets', () => {
    const store = useStockStore()
    store.resetForTesting()
    const item = store.upsertStock({
      symbol: 'SPHN',
      name: 'SchatPhone Index',
      price: 128.8,
      quantity: 3,
    })
    store.saveNow()

    setActivePinia(createPinia())
    const restoredStore = useStockStore()

    expect(restoredStore.findStockBySymbol('SPHN')?.quantity).toBe(3)
    expect(restoredStore.removeStock(item.id)).toBe(true)
    expect(restoredStore.findStockBySymbol('SPHN')).toBeNull()

    const snapshot = {
      stock: {
        items: [
          {
            id: 'stock_backup_1',
            symbol: 'BACK',
            name: 'Backup Asset',
            price: 8,
            quantity: 4,
          },
        ],
      },
    }

    expect(restoredStore.restoreFromBackup(snapshot)).toBe(true)
    expect(restoredStore.watchlistCount).toBe(1)
    expect(restoredStore.findStockBySymbol('BACK')?.priceCents).toBe(800)
  })
})
