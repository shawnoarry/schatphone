export const MESSAGE_EDIT_REASON = Object.freeze({
  EMPTY: 'empty',
  TOO_LONG: 'too_long',
  UNCHANGED: 'unchanged',
  READY_ASSISTANT: 'ready_assistant',
  READY_USER: 'ready_user',
})

const DEFAULT_MAX_CHARS = 3000

const normalizeMaxChars = (value) => {
  const num = Number(value)
  if (!Number.isFinite(num) || num <= 0) return DEFAULT_MAX_CHARS
  return Math.floor(num)
}

const normalizeRole = (value) => (value === 'assistant' ? 'assistant' : 'user')

export const buildMessageEditValidation = (input = {}) => {
  const maxChars = normalizeMaxChars(input.maxChars)
  const role = normalizeRole(input.role)
  const text = typeof input.draftText === 'string' ? input.draftText.trim() : ''
  const originalText = typeof input.originalText === 'string' ? input.originalText.trim() : ''

  if (!text) {
    return {
      valid: false,
      text: '',
      reason: MESSAGE_EDIT_REASON.EMPTY,
      maxChars,
      role,
    }
  }

  if (text.length > maxChars) {
    return {
      valid: false,
      text: '',
      reason: MESSAGE_EDIT_REASON.TOO_LONG,
      maxChars,
      role,
    }
  }

  if (text === originalText) {
    return {
      valid: false,
      text,
      reason: MESSAGE_EDIT_REASON.UNCHANGED,
      maxChars,
      role,
    }
  }

  return {
    valid: true,
    text,
    reason:
      role === 'assistant'
        ? MESSAGE_EDIT_REASON.READY_ASSISTANT
        : MESSAGE_EDIT_REASON.READY_USER,
    maxChars,
    role,
  }
}

