import { describe, expect, test } from 'vitest'
import {
  estimateChatMessagesTokens,
  estimateChatRequestTokens,
  estimateTextTokens,
  estimateTokenParts,
} from '../src/lib/ai-token-estimate'

describe('AI token estimates', () => {
  test('estimates Chinese and Latin text without imposing a content limit', () => {
    expect(estimateTextTokens('')).toBe(0)
    expect(estimateTextTokens('世界设定')).toBe(4)
    expect(estimateTextTokens('abcd')).toBe(1)
    expect(estimateTextTokens('世界abcd')).toBe(3)
    expect(estimateTextTokens('世界设定'.repeat(5000))).toBe(20_000)
  })

  test('adds message and request overhead while ignoring image-only parts', () => {
    const messages = [
      { role: 'user', content: 'hello world' },
      {
        role: 'assistant',
        content: [
          { type: 'text', text: '你好' },
          { type: 'image_url', image_url: { url: 'https://example.com/image.png' } },
        ],
      },
    ]

    const messageTokens = estimateChatMessagesTokens(messages)
    expect(messageTokens).toBeGreaterThan(estimateTextTokens('hello world你好'))
    expect(
      estimateChatRequestTokens({
        systemPrompt: 'Follow the active world setting.',
        messages,
      }),
    ).toBeGreaterThan(messageTokens)
  })

  test('keeps part estimates observable and additive', () => {
    const result = estimateTokenParts([
      { id: 'world', label: 'World', text: '夜城规则' },
      { id: 'memory', label: 'Memory', text: 'Shared dinner after patrol.' },
    ])

    expect(result.parts).toEqual([
      expect.objectContaining({ id: 'world', tokens: 4 }),
      expect.objectContaining({ id: 'memory', tokens: 7 }),
    ])
    expect(result.totalTokens).toBe(
      result.parts.reduce((total, part) => total + part.tokens, 0),
    )
  })
})
