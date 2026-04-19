import { describe, expect, test } from 'vitest'
import {
  appendForegroundBannerQueue,
  collectForegroundBannerNotes,
} from '../src/lib/foreground-banner-queue'

describe('foreground banner queue helpers', () => {
  test('collects unseen unread notes in oldest-first presentation order', () => {
    const notes = [
      { id: 'note-3', read: false, title: 'Newest' },
      { id: 'note-2', read: true, title: 'Read note' },
      { id: 'note-1', read: false, title: 'Older' },
      { id: 'note-0', read: false, title: 'Already seen' },
    ]

    const seenIds = new Set(['note-0'])
    const collected = collectForegroundBannerNotes(notes, seenIds)

    expect(collected.map((note) => note.id)).toEqual(['note-1', 'note-3'])
  })

  test('dedupes queued notes against active banner and existing queue', () => {
    const activeNote = { id: 'note-active', read: false }
    const existingQueue = [{ id: 'note-queued', read: false }]
    const incoming = [
      { id: 'note-active', read: false },
      { id: 'note-queued', read: false },
      { id: 'note-new', read: false },
    ]

    const nextQueue = appendForegroundBannerQueue(existingQueue, incoming, activeNote)

    expect(nextQueue.map((note) => note.id)).toEqual(['note-queued', 'note-new'])
  })
})
