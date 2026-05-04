import { beforeEach, describe, expect, test, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useCalendarStore } from '../src/stores/calendar'
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

  test('creates Calendar market cues for large simulated moves and cleans them up', () => {
    const store = useStockStore()
    const calendarStore = useCalendarStore()
    store.resetForTesting()
    calendarStore.resetForTesting()

    const calm = store.upsertStock({
      symbol: 'CALM',
      name: 'Calm Asset',
      price: 10,
      changePercent: 1.2,
    })

    expect(calm).toBeTruthy()
    expect(store.calendarCueEligibleCount).toBe(0)
    expect(calendarStore.stockMarketCueCount).toBe(0)

    const mover = store.upsertStock({
      symbol: 'NOVA',
      name: 'Nova Labs',
      price: 12.34,
      changePercent: 4.5,
      note: 'Earnings rumor',
    })
    const cue = calendarStore.findStockMarketCueByStockId(mover.id)

    expect(store.calendarCueEligibleCount).toBe(1)
    expect(cue).toMatchObject({
      stockId: mover.id,
      symbol: 'NOVA',
      name: 'Nova Labs',
      status: 'suggested',
      source: 'stock_market_move',
      route: '/stock',
    })
    expect(cue?.suggestedAt).toBe(mover.updatedAt + 2 * 60 * 60 * 1000)

    const event = calendarStore.confirmStockMarketCue(cue.id)

    expect(event).toMatchObject({
      source: 'stock_market_move',
      sourceReminderId: cue.id,
      titleEn: 'Review NOVA',
      route: '/stock',
      status: 'confirmed',
    })
    expect(calendarStore.findStockMarketCueById(cue.id)?.status).toBe('confirmed')

    const snapshot = calendarStore.createBackupSnapshot()
    setActivePinia(createPinia())
    const restoredCalendar = useCalendarStore()
    expect(restoredCalendar.restoreFromBackup({ calendar: snapshot })).toBe(true)
    expect(restoredCalendar.findStockMarketCueByStockId(mover.id)?.status).toBe('confirmed')
    expect(restoredCalendar.findEventBySourceReminderId(cue.id)?.titleEn).toBe('Review NOVA')

    const nextStockStore = useStockStore()
    expect(nextStockStore.restoreFromBackup({ stock: { items: [mover] } })).toBe(true)
    expect(nextStockStore.updatePrice('NOVA', { price: 12.4, changePercent: 0.4 })?.changePercent).toBe(0.4)
    expect(restoredCalendar.findStockMarketCueByStockId(mover.id)?.status).toBe('dismissed')
    expect(restoredCalendar.findEventBySourceReminderId(cue.id)).toBeNull()
  })
})
