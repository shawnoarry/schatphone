import { describe, expect, it } from 'vitest'
import { formatApiErrorForUi } from '../src/lib/ai'

describe('formatApiErrorForUi', () => {
  it('maps auth errors', () => {
    const message = formatApiErrorForUi({ code: 'AUTH', status: 401 })
    expect(message).toContain('鉴权失败')
    expect(message).toContain('401')
  })

  it('maps invalid url errors', () => {
    const message = formatApiErrorForUi({ code: 'INVALID_URL' })
    expect(message).toContain('URL')
  })

  it('falls back to given message', () => {
    const message = formatApiErrorForUi({}, 'fallback message')
    expect(message).toBe('fallback message')
  })
})
