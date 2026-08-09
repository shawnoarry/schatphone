import { describe, expect, test, vi } from 'vitest'
import {
  INTERNAL_CHAT_SHARE_STORAGE_KEY,
  clearPendingInternalChatShare,
  createPendingInternalChatShare,
  isInternalChatShareRoute,
  readPendingInternalChatShare,
  savePendingInternalChatShare,
} from '../src/lib/internal-chat-share'
import { createMapLocationShareObject } from '../src/lib/shareable-object'

const createStorage = () => {
  const values = new Map()
  return {
    getItem: vi.fn((key) => values.get(key) || null),
    setItem: vi.fn((key, value) => values.set(key, value)),
    removeItem: vi.fn((key) => values.delete(key)),
  }
}

const mapShare = createMapLocationShareObject({
  placeId: 'seoul-sm-hq',
  mapPackId: 'modern-seoul',
  title: 'SM Entertainment',
  summary: 'Seongsu, Seoul',
})

describe('internal App to Chat share draft', () => {
  test('keeps one normalized source object and return route until confirmation', () => {
    const storage = createStorage()
    const draft = savePendingInternalChatShare(
      {
        shareable: mapShare,
        sourceRoute: '/map?placeId=seoul-sm-hq',
      },
      storage,
      1_800_000_000_000,
    )

    expect(draft).toMatchObject({
      shareable: {
        type: 'location_share',
        sourceModule: 'map',
        sourceId: 'seoul-sm-hq',
      },
      sourceRoute: '/map?placeId=seoul-sm-hq',
    })
    expect(storage.setItem).toHaveBeenCalledWith(
      INTERNAL_CHAT_SHARE_STORAGE_KEY,
      expect.stringContaining('SM Entertainment'),
    )
    expect(readPendingInternalChatShare(storage, 1_800_000_000_500)).toMatchObject({
      sourceRoute: '/map?placeId=seoul-sm-hq',
    })

    expect(clearPendingInternalChatShare(storage)).toBe(true)
    expect(readPendingInternalChatShare(storage, 1_800_000_000_500)).toBeNull()
  })

  test('rejects invalid source objects and sanitizes unsafe return routes', () => {
    expect(createPendingInternalChatShare({ shareable: null })).toBeNull()
    expect(
      createPendingInternalChatShare({
        shareable: mapShare,
        sourceRoute: 'https://example.com',
      }),
    ).toMatchObject({ sourceRoute: '/home' })
    expect(
      createPendingInternalChatShare({
        shareable: mapShare,
        sourceRoute: '/chat/1',
      }),
    ).toMatchObject({ sourceRoute: '/home' })
  })

  test('expires the transient draft after 24 hours', () => {
    const storage = createStorage()
    savePendingInternalChatShare(
      { shareable: mapShare, sourceRoute: '/map' },
      storage,
      1_800_000_000_000,
    )

    expect(
      readPendingInternalChatShare(storage, 1_800_000_000_000 + 24 * 60 * 60 * 1000 + 1),
    ).toBeNull()
    expect(storage.removeItem).toHaveBeenCalledWith(INTERNAL_CHAT_SHARE_STORAGE_KEY)
  })

  test('recognizes only Chat routes with the internal share marker', () => {
    expect(isInternalChatShareRoute({ path: '/chat', query: { share: 'internal' } })).toBe(true)
    expect(isInternalChatShareRoute({ path: '/chat/1', query: { share: 'internal' } })).toBe(true)
    expect(isInternalChatShareRoute({ path: '/chat/1', query: {} })).toBe(false)
    expect(isInternalChatShareRoute({ path: '/music', query: { share: 'internal' } })).toBe(false)
  })
})
