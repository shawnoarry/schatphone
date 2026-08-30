import { beforeEach, describe, expect, test, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useChronicleStore } from '../src/stores/chronicle'

const NOW = new Date('2026-08-30T13:00:00+08:00').getTime()

describe('Chronicle store', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
    localStorage.clear()
    setActivePinia(createPinia())
  })

  test('creates, edits, deletes, and reopens user-authored diary entries', async () => {
    const store = useChronicleStore()
    await vi.waitFor(() => expect(store.hasFinishedStorageHydration).toBe(true))

    const created = store.addEntry({
      entryDate: '2026-08-30',
      title: 'A long day',
      body: 'I chose to write this myself.',
      mood: 'steady',
      tags: ['work'],
      sourceRefs: [{
        owner: 'calendar',
        recordType: 'calendar_event',
        recordId: 'calendar_event_1',
        revision: 'revision_1',
      }],
    }, { now: NOW })
    expect(created).toMatchObject({ ok: true, code: 'chronicle_entry_created' })
    expect(created.entry.id).toMatch(/^chronicle_entry::/)

    const updated = store.editEntry(created.entry.id, {
      body: 'I revised only my own words.',
    }, { now: NOW + 1 })
    expect(updated).toMatchObject({ ok: true, entry: { body: 'I revised only my own words.' } })

    setActivePinia(createPinia())
    const reopened = useChronicleStore()
    expect(reopened.entries).toHaveLength(1)
    expect(reopened.entries[0].sourceRefs[0]).toMatchObject({
      owner: 'calendar',
      recordId: 'calendar_event_1',
    })

    expect(reopened.deleteEntry(reopened.entries[0].id)).toMatchObject({
      ok: true,
      code: 'chronicle_entry_deleted',
    })
    expect(reopened.entries).toEqual([])
  })

  test('rolls back a diary mutation when persistence fails', async () => {
    const store = useChronicleStore()
    await vi.waitFor(() => expect(store.hasFinishedStorageHydration).toBe(true))
    const originalSetItem = localStorage.setItem.bind(localStorage)
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation((key, value) => {
      if (String(key).includes('chronicle')) throw new Error('disk full')
      return originalSetItem(key, value)
    })

    const result = store.addEntry({ body: 'This must not remain in memory.' }, { now: NOW })
    expect(result).toMatchObject({ ok: false, code: 'persistence_failed', rolledBack: true })
    expect(store.entries).toEqual([])
    spy.mockRestore()
  })

  test('restores older backups without Chronicle as an empty owner', async () => {
    const store = useChronicleStore()
    await vi.waitFor(() => expect(store.hasFinishedStorageHydration).toBe(true))
    store.addEntry({ body: 'Current local entry' }, { now: NOW })
    expect(store.restoreFromBackup({})).toBe(true)
    expect(store.entries).toEqual([])
  })
})
