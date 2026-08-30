import { describe, expect, test } from 'vitest'
import {
  CHRONICLE_MOOD,
  createChronicleEntry,
  normalizeChronicleEntries,
  normalizeChronicleSourceRef,
  updateChronicleEntry,
} from '../src/lib/chronicle'

describe('Chronicle owner contract', () => {
  test('normalizes one user-owned diary entry without copying source bodies', () => {
    const entry = createChronicleEntry({
      entryDate: '2026-08-30',
      title: '  After the rehearsal  ',
      body: '  I finally had time to breathe.  ',
      mood: CHRONICLE_MOOD.CALM,
      tags: ['Work', 'work', 'Evening'],
      sourceRefs: [{
        owner: 'calendar',
        recordType: 'calendar_event',
        recordId: 'calendar_1',
        revision: 'rev_1',
        route: '/forged',
        query: { calendarEventId: 'calendar_1', nested: { private: true } },
        sourceBody: 'must not survive',
      }],
    }, { id: 'chronicle_entry_1', now: 1_788_067_200_000 })

    expect(entry).toMatchObject({
      id: 'chronicle_entry_1',
      entryDate: '2026-08-30',
      title: 'After the rehearsal',
      body: 'I finally had time to breathe.',
      mood: CHRONICLE_MOOD.CALM,
      tags: ['work', 'evening'],
    })
    expect(entry.sourceRefs[0]).toEqual({
      owner: 'calendar',
      recordType: 'calendar_event',
      recordId: 'calendar_1',
      revision: 'rev_1',
      route: '/calendar',
      query: { calendarEventId: 'calendar_1' },
    })
    expect(JSON.stringify(entry)).not.toContain('sourceBody')
  })

  test('keeps stable identity and creation time when editing', () => {
    const created = createChronicleEntry({ body: 'First note' }, {
      id: 'chronicle_entry_2',
      now: 1_788_067_200_000,
    })
    const updated = updateChronicleEntry(created, { body: 'Revised note' }, {
      now: 1_788_067_260_000,
    })

    expect(updated.id).toBe(created.id)
    expect(updated.createdAt).toBe(created.createdAt)
    expect(updated.updatedAt).toBe(1_788_067_260_000)
    expect(updated.body).toBe('Revised note')
  })

  test('deduplicates entries by stable id and rejects unsafe source owners', () => {
    expect(normalizeChronicleSourceRef({
      owner: 'wallet',
      recordType: 'transaction',
      recordId: 'tx_1',
    })).toBeNull()

    const entries = normalizeChronicleEntries([
      { id: 'entry', body: 'old', createdAt: 10, updatedAt: 10 },
      { id: 'entry', body: 'new', createdAt: 10, updatedAt: 20 },
    ])
    expect(entries).toHaveLength(1)
    expect(entries[0].body).toBe('new')
  })
})
