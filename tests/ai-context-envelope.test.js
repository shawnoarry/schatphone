import { describe, expect, test } from 'vitest'
import {
  createAiContextEnvelope,
  resolveAiContextEnvelope,
} from '../src/lib/ai-context-envelope'

describe('AI context envelope', () => {
  test('keeps stable blocks before dynamic blocks and creates a non-sensitive cache key', () => {
    const result = createAiContextEnvelope({
      stableBlocks: ['', { text: 'World rules' }, 'Role persona'],
      dynamicBlocks: ['Current relationship', null, { text: 'Turn capability' }],
      cacheNamespace: 'Chat Reply',
      cacheIdentity: 'role:42',
    })

    expect(result).toMatchObject({
      stablePrefix: 'World rules\n\nRole persona',
      dynamicContext: 'Current relationship\n\nTurn capability',
      systemPrompt:
        'World rules\n\nRole persona\n\nCurrent relationship\n\nTurn capability',
    })
    expect(result.cache.key).toMatch(/^schatphone:chat-reply:v1:id-[a-f0-9]{8}$/)
    expect(result.cache.key).not.toContain('role:42')
    expect(result.cache.key.length).toBeLessThanOrEqual(64)
  })

  test('changes cache identity only when stable content or owning identity changes', () => {
    const base = createAiContextEnvelope({
      stableBlocks: ['World rules', 'Role persona'],
      dynamicBlocks: ['Relationship stage: warm'],
      cacheNamespace: 'chat',
      cacheIdentity: 'role:42',
    })
    const dynamicChange = createAiContextEnvelope({
      stableBlocks: ['World rules', 'Role persona'],
      dynamicBlocks: ['Relationship stage: conflict'],
      cacheNamespace: 'chat',
      cacheIdentity: 'role:42',
    })
    const stableChange = createAiContextEnvelope({
      stableBlocks: ['World rules', 'Role persona changed'],
      dynamicBlocks: ['Relationship stage: warm'],
      cacheNamespace: 'chat',
      cacheIdentity: 'role:42',
    })
    const identityChange = createAiContextEnvelope({
      stableBlocks: ['World rules', 'Role persona'],
      dynamicBlocks: ['Relationship stage: warm'],
      cacheNamespace: 'chat',
      cacheIdentity: 'role:43',
    })

    expect(dynamicChange.cache.key).toBe(base.cache.key)
    expect(dynamicChange.cache.stableFingerprint).toBe(base.cache.stableFingerprint)
    expect(stableChange.cache.key).not.toBe(base.cache.key)
    expect(stableChange.cache.stableFingerprint).not.toBe(base.cache.stableFingerprint)
    expect(identityChange.cache.key).not.toBe(base.cache.key)
    expect(base.cache.key).not.toContain('role:42')
  })

  test('preserves the legacy system prompt when no stable prefix is available', () => {
    expect(resolveAiContextEnvelope('Legacy prompt', null)).toEqual({
      stablePrefix: '',
      dynamicContext: '',
      systemPrompt: 'Legacy prompt',
      cacheKey: '',
    })
  })

  test('handles malformed root input without exposing a cache key', () => {
    expect(createAiContextEnvelope(null)).toMatchObject({
      stablePrefix: '',
      dynamicContext: '',
      systemPrompt: '',
      cache: { key: '' },
    })
  })
})
