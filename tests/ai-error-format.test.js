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

  it('maps timeout errors', () => {
    const message = formatApiErrorForUi({ code: 'TIMEOUT' })
    expect(message).toContain('超时')
  })

  it('maps canceled errors', () => {
    const message = formatApiErrorForUi({ code: 'CANCELED' })
    expect(message).toContain('取消')
  })

  it('maps network errors', () => {
    const message = formatApiErrorForUi({ code: 'NETWORK' })
    expect(message).toContain('网络')
  })

  it('falls back to given message', () => {
    const message = formatApiErrorForUi({}, 'fallback message')
    expect(message).toBe('fallback message')
  })
})
