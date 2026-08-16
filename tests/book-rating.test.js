import { describe, expect, test } from 'vitest'
import { getBookCompletenessRating } from '../src/lib/book-rating'

describe('getBookCompletenessRating', () => {
  test('empty or missing asset is unrated', () => {
    expect(getBookCompletenessRating(null)).toEqual({ score: 0, stars: 0 })
    expect(getBookCompletenessRating({ content: '' })).toEqual({ score: 0, stars: 0 })
  })

  test('rich asset with links approaches full score deterministically', () => {
    const asset = {
      content: 'x'.repeat(4000),
      sections: Array.from({ length: 10 }, (_, i) => ({ id: `s${i}`, title: `S${i}` })),
      tags: ['a', 'b', 'c', 'd'],
    }
    const first = getBookCompletenessRating(asset, 3)
    const second = getBookCompletenessRating(asset, 3)
    expect(first).toEqual(second)
    expect(first.score).toBe(5)
    expect(first.stars).toBe(5)
  })

  test('thin asset scores low but stable', () => {
    const asset = { content: 'short note', sections: [], tags: [] }
    const rating = getBookCompletenessRating(asset, 0)
    expect(rating.score).toBeGreaterThanOrEqual(0)
    expect(rating.score).toBeLessThan(1)
  })

  test('partial content yields mid-range score', () => {
    const asset = {
      content: 'y'.repeat(1500),
      sections: [{ id: 's1', title: 'One' }],
      tags: ['tag'],
    }
    const rating = getBookCompletenessRating(asset, 1)
    expect(rating.score).toBeGreaterThan(1)
    expect(rating.score).toBeLessThan(4)
  })
})
