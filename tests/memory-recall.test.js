import { describe, expect, test } from 'vitest'
import { buildMemoryRecallQuery, selectMemoryRecall } from '../src/lib/memory-recall'

const memory = (overrides = {}) => ({
  memoryKey: 'memory',
  recallSummary: 'A shared memory.',
  reviewStatus: 'active',
  latestCreatedAt: 1,
  ...overrides,
})

describe('memory recall Module', () => {
  test('selects an older relevant memory before a newer unrelated memory', () => {
    const result = selectMemoryRecall({
      memories: [
        memory({
          memoryKey: 'recent_call',
          recallSummary: 'We had a short phone call about work.',
          latestCreatedAt: 200,
        }),
        memory({
          memoryKey: 'birthday_gift',
          recallSummary: 'You gave me a silver birthday necklace.',
          latestCreatedAt: 100,
        }),
      ],
      queryText: 'Do you still remember the birthday necklace?',
      limit: 1,
    })

    expect(result.items.map((item) => item.memoryKey)).toEqual(['birthday_gift'])
    expect(result.items[0].relevant).toBe(true)
  })

  test('supports Chinese topic matching, keeps pinned memories first, and excludes archived memories', () => {
    const result = selectMemoryRecall({
      memories: [
        memory({
          memoryKey: 'archived_gift',
          recallSummary: '我们一起挑过生日礼物。',
          reviewStatus: 'archived',
          latestCreatedAt: 300,
        }),
        memory({
          memoryKey: 'active_gift',
          recallSummary: '你送过一条生日项链。',
          latestCreatedAt: 100,
        }),
        memory({
          memoryKey: 'pinned_trip',
          recallSummary: '第一次一起去海边。',
          reviewStatus: 'pinned',
          latestCreatedAt: 50,
        }),
      ],
      queryText: '还记得那条生日项链吗？',
      limit: 2,
    })

    expect(result.items.map((item) => item.memoryKey)).toEqual(['pinned_trip', 'active_gift'])
    expect(result.text).not.toContain('生日礼物')
  })

  test('falls back to pinned and recent order when no query matches', () => {
    const result = selectMemoryRecall({
      memories: [
        memory({ memoryKey: 'older', recallSummary: 'Older.', latestCreatedAt: 10 }),
        memory({ memoryKey: 'newer', recallSummary: 'Newer.', latestCreatedAt: 20 }),
        memory({
          memoryKey: 'pinned',
          recallSummary: 'Pinned.',
          reviewStatus: 'pinned',
          latestCreatedAt: 1,
        }),
      ],
      queryText: 'Unrelated topic',
      limit: 3,
    })

    expect(result.items.map((item) => item.memoryKey)).toEqual(['pinned', 'newer', 'older'])
  })

  test('keeps recall output inside the character budget', () => {
    const result = selectMemoryRecall({
      memories: [memory({ recallSummary: 'x'.repeat(200) })],
      characterBudget: 80,
    })

    expect(result.text.length).toBeLessThanOrEqual(80)
    expect(result.text.endsWith('...')).toBe(true)
  })

  test('builds a bounded query from only the latest messages', () => {
    const query = buildMemoryRecallQuery(
      Array.from({ length: 6 }, (_, index) => ({
        role: index % 2 === 0 ? 'user' : 'assistant',
        content: `message-${index + 1}`,
      })),
      { messageLimit: 3, characterLimit: 80 },
    )

    expect(query).toBe('message-4\nmessage-5\nmessage-6')
    expect(query).not.toContain('message-3')
  })

  test('honors explicit zero limits and malformed options', () => {
    expect(buildMemoryRecallQuery([{ role: 'user', content: 'private turn' }], { messageLimit: 0 })).toBe('')
    expect(buildMemoryRecallQuery([{ role: 'user', content: 'private turn' }], null)).toBe('private turn')
    expect(selectMemoryRecall({ memories: [memory()], limit: 0 }).items).toEqual([])
    expect(selectMemoryRecall({ memories: [memory()], characterBudget: 0 }).items).toEqual([])
    expect(selectMemoryRecall(null).items).toEqual([])
  })

  test('uses stable keys to break ties regardless of input order', () => {
    const memories = [
      memory({ memoryKey: 'zeta', recallSummary: 'Same topic zeta.', latestCreatedAt: 10 }),
      memory({ memoryKey: 'alpha', recallSummary: 'Same topic alpha.', latestCreatedAt: 10 }),
    ]
    const selectKeys = (items) =>
      selectMemoryRecall({ memories: items, queryText: 'same topic', limit: 2 }).items.map(
        (item) => item.memoryKey,
      )

    expect(selectKeys(memories)).toEqual(['alpha', 'zeta'])
    expect(selectKeys([...memories].reverse())).toEqual(['alpha', 'zeta'])
  })

  test('does not mutate or alias mutable memory arrays', () => {
    const memories = [memory({ memoryKey: 'nested', sourceModules: ['chat'] })]
    const original = structuredClone(memories)
    const result = selectMemoryRecall({ memories })

    result.items[0].sourceModules.push('changed')
    expect(memories).toEqual(original)
  })
})
