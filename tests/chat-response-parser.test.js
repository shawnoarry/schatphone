import { describe, expect, test } from 'vitest'
import {
  collectJsonCandidates,
  extractAssistantPayloadText,
  parseAssistantJsonPayload,
  stripCodeFence,
} from '../src/lib/chat-response'

describe('chat response parser', () => {
  test('parses plain object payload with messages field', () => {
    const raw =
      '{"messages":[{"replyType":"plain","blocks":[{"type":"text","variant":"primary","text":"hello"}]}]}'
    const parsed = parseAssistantJsonPayload(raw)
    expect(Array.isArray(parsed?.messages)).toBe(true)
    expect(parsed?.messages?.length).toBe(1)
  })

  test('parses fenced json payload', () => {
    const raw = '```json\n{"messages":[{"replyType":"plain","blocks":[{"type":"text","text":"hi"}]}]}\n```'
    const parsed = parseAssistantJsonPayload(raw)
    expect(Array.isArray(parsed?.messages)).toBe(true)
    expect(parsed?.messages?.[0]?.replyType).toBe('plain')
  })

  test('parses embedded object payload in prose wrapper', () => {
    const raw = 'Sure, here is the response:\n{"messages":[{"replyType":"plain","blocks":[{"type":"text","text":"ok"}]}]}'
    const parsed = parseAssistantJsonPayload(raw)
    expect(Array.isArray(parsed?.messages)).toBe(true)
    expect(parsed?.messages?.[0]?.blocks?.[0]?.text).toBe('ok')
  })

  test('parses top-level array payload as messages', () => {
    const raw = '[{"replyType":"plain","blocks":[{"type":"text","text":"array"}]}]'
    const parsed = parseAssistantJsonPayload(raw)
    expect(Array.isArray(parsed?.messages)).toBe(true)
    expect(parsed?.messages?.[0]?.blocks?.[0]?.text).toBe('array')
  })

  test('returns null for invalid payload', () => {
    expect(parseAssistantJsonPayload('not json')).toBe(null)
  })

  test('collects deduplicated candidates from mixed text', () => {
    const raw = 'prefix\n```json\n{"messages":[]}\n```\nsuffix'
    const candidates = collectJsonCandidates(raw)
    expect(candidates.length).toBeGreaterThan(0)
    expect(candidates.some((item) => item.includes('"messages"'))).toBe(true)
    expect(stripCodeFence(raw)).not.toContain('```')
  })

  test('extracts fallback text from common payload fields', () => {
    expect(extractAssistantPayloadText({ content: 'alpha' })).toBe('alpha')
    expect(extractAssistantPayloadText({ text: 'beta' })).toBe('beta')
    expect(extractAssistantPayloadText({ message: 'gamma' })).toBe('gamma')
    expect(extractAssistantPayloadText({ output_text: 'delta' })).toBe('delta')
  })

  test('extracts fallback text from array content variants', () => {
    const payload = {
      content: [{ text: { value: 'array_text_value' } }],
    }
    expect(extractAssistantPayloadText(payload)).toBe('array_text_value')
  })

  test('returns empty string when no fallback text exists', () => {
    expect(extractAssistantPayloadText({})).toBe('')
    expect(extractAssistantPayloadText(null)).toBe('')
  })
})
