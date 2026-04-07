import { describe, expect, test } from 'vitest'
import { buildMessageEditValidation, MESSAGE_EDIT_REASON } from '../src/lib/chat-message-edit'

describe('chat message edit validation', () => {
  test('rejects empty draft text', () => {
    const result = buildMessageEditValidation({
      draftText: '   ',
      originalText: 'old text',
      role: 'assistant',
      maxChars: 3000,
    })

    expect(result.valid).toBe(false)
    expect(result.reason).toBe(MESSAGE_EDIT_REASON.EMPTY)
    expect(result.text).toBe('')
  })

  test('rejects draft text exceeding max chars', () => {
    const result = buildMessageEditValidation({
      draftText: '12345678901',
      originalText: 'old',
      role: 'assistant',
      maxChars: 10,
    })

    expect(result.valid).toBe(false)
    expect(result.reason).toBe(MESSAGE_EDIT_REASON.TOO_LONG)
    expect(result.maxChars).toBe(10)
  })

  test('rejects unchanged text after trimming', () => {
    const result = buildMessageEditValidation({
      draftText: ' hello world  ',
      originalText: 'hello world',
      role: 'user',
    })

    expect(result.valid).toBe(false)
    expect(result.reason).toBe(MESSAGE_EDIT_REASON.UNCHANGED)
    expect(result.text).toBe('hello world')
  })

  test('returns assistant-ready state for changed text', () => {
    const result = buildMessageEditValidation({
      draftText: ' revised assistant reply ',
      originalText: 'original assistant reply',
      role: 'assistant',
    })

    expect(result.valid).toBe(true)
    expect(result.reason).toBe(MESSAGE_EDIT_REASON.READY_ASSISTANT)
    expect(result.text).toBe('revised assistant reply')
  })

  test('returns user-ready state for changed text', () => {
    const result = buildMessageEditValidation({
      draftText: ' revised user message ',
      originalText: 'original user message',
      role: 'user',
    })

    expect(result.valid).toBe(true)
    expect(result.reason).toBe(MESSAGE_EDIT_REASON.READY_USER)
    expect(result.text).toBe('revised user message')
  })
})

