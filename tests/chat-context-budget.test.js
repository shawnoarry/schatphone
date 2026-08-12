import { describe, expect, test } from 'vitest'
import {
  CHAT_CONTEXT_BUDGET_DEFAULTS,
  projectChatContextBudget,
  truncateChatContextText,
} from '../src/lib/chat-context-budget'

describe('Chat context budget projection', () => {
  test('keeps a contiguous recent window and drops an older oversized message first', () => {
    const sourceMessages = [
      { id: 'old-short', role: 'user' },
      { id: 'old-long', role: 'assistant' },
      { id: 'recent-1', role: 'user' },
      { id: 'recent-2', role: 'assistant' },
    ]
    const aiMessages = [
      { role: 'user', content: 'old short' },
      { role: 'assistant', content: 'x'.repeat(90) },
      { role: 'user', content: 'recent question' },
      { role: 'assistant', content: 'recent answer' },
    ]

    const projection = projectChatContextBudget({
      sourceMessages,
      aiMessages,
      characterBudget: 50,
    })

    expect(projection.sourceMessages.map((message) => message.id)).toEqual([
      'recent-1',
      'recent-2',
    ])
    expect(projection.aiMessages.map((message) => message.content)).toEqual([
      'recent question',
      'recent answer',
    ])
    expect(projection.diagnostics).toMatchObject({
      candidateCount: 4,
      includedCount: 2,
      omittedCount: 2,
      includedCharacters: 28,
      truncatedMessageCount: 0,
    })
  })

  test('retains a bounded head and tail when the newest message alone exceeds the budget', () => {
    const content = `opening-${'x'.repeat(120)}-latest-intent`
    const projection = projectChatContextBudget({
      sourceMessages: [{ id: 'latest', role: 'user', content }],
      aiMessages: [{ role: 'user', content }],
      characterBudget: 72,
    })

    expect(projection.sourceMessages[0].content).toBe(content)
    expect(projection.aiMessages[0].content).toHaveLength(72)
    expect(projection.aiMessages[0].content).toContain('opening-')
    expect(projection.aiMessages[0].content).toContain('-latest-intent')
    expect(projection.aiMessages[0].content).toContain('earlier content omitted')
    expect(projection.diagnostics.truncatedMessageCount).toBe(1)
  })

  test('normalizes malformed AI messages without mutating rich or recalled source records', () => {
    const sourceMessages = [
      {
        id: 'rich',
        role: 'user',
        blocks: [{ type: 'image_virtual', caption: 'Original caption' }],
      },
      { id: 'recalled', role: 'assistant', recalledAt: 1, content: '' },
    ]
    const aiMessages = [
      { role: 'user', content: '[image] Original caption' },
      { role: 'assistant', content: null },
    ]
    const before = structuredClone({ sourceMessages, aiMessages })

    const projection = projectChatContextBudget({
      sourceMessages,
      aiMessages,
      characterBudget: 80,
    })

    expect(projection.aiMessages).toEqual([
      { role: 'user', content: '[image] Original caption' },
      { role: 'assistant', content: '' },
    ])
    expect({ sourceMessages, aiMessages }).toEqual(before)
    expect(projection.sourceMessages[0]).toBe(sourceMessages[0])
  })

  test('is deterministic and provider-neutral across repeated projections', () => {
    const input = {
      sourceMessages: [{ id: 'one' }, { id: 'two' }],
      aiMessages: [
        { role: 'user', content: 'one' },
        { role: 'assistant', content: 'two' },
      ],
      characterBudget: CHAT_CONTEXT_BUDGET_DEFAULTS.characters,
    }

    expect(projectChatContextBudget(input)).toEqual(projectChatContextBudget(input))
    expect(projectChatContextBudget({ ...input, provider: 'multimodal' })).toEqual(
      projectChatContextBudget({ ...input, provider: 'text-only' }),
    )
  })

  test('handles zero budgets, mismatched arrays, and small truncation limits', () => {
    expect(projectChatContextBudget(null).aiMessages).toEqual([])
    expect(
      projectChatContextBudget({
        sourceMessages: [{ id: 'one' }],
        aiMessages: [{ role: 'user', content: 'one' }],
        characterBudget: 0,
      }).diagnostics.omittedCount,
    ).toBe(1)
    expect(
      projectChatContextBudget({
        sourceMessages: [{ id: 'one' }],
        aiMessages: [],
      }).diagnostics.candidateCount,
    ).toBe(0)
    expect(truncateChatContextText('abcdefghij', 4)).toBe('ghij')
  })
})
